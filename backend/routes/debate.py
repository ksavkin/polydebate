"""
Debate routes - AI debate endpoints
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context
import asyncio
import json
import logging
from services.debate import debate_service
from services.elevenlabs import elevenlabs_service
from config import config
from database import get_db
from models.db_models import DebateDB
from models.user import User
from utils.auth import require_auth

logger = logging.getLogger(__name__)
debate_bp = Blueprint('debate', __name__)


@debate_bp.route('/debates', methods=['GET'])
def list_debates():
    """GET /api/debates - List all debates"""
    try:
        debates = debate_service.list_debates()
        return jsonify({
            'debates': debates,
            'total': len(debates)
        }), 200
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(e)
            }
        }), 500


@debate_bp.route('/debate/start', methods=['POST'])
@require_auth
def start_debate(current_user):
    """POST /api/debate/start - Create and start a new debate"""
    try:
        data = request.get_json()

        # Validate request
        if not data:
            return jsonify({
                'error': {
                    'code': 'invalid_request',
                    'message': 'Request body is required'
                }
            }), 400

        market_id = data.get('market_id')
        model_ids = data.get('model_ids', [])
        rounds = data.get('rounds', 3)

        # Validate required fields
        if not market_id:
            return jsonify({
                'error': {
                    'code': 'invalid_request',
                    'message': 'market_id is required'
                }
            }), 400

        if not model_ids or not isinstance(model_ids, list):
            return jsonify({
                'error': {
                    'code': 'invalid_request',
                    'message': 'model_ids must be a non-empty array'
                }
            }), 400

        # Validate limits
        if len(model_ids) > config.MAX_MODELS_PER_DEBATE:
            return jsonify({
                'error': {
                    'code': 'invalid_request',
                    'message': f'Maximum {config.MAX_MODELS_PER_DEBATE} models allowed per debate'
                }
            }), 400

        if rounds > config.MAX_ROUNDS or rounds < 1:
            return jsonify({
                'error': {
                    'code': 'invalid_request',
                    'message': f'Rounds must be between 1 and {config.MAX_ROUNDS}'
                }
            }), 400

        # Check daily debate limit
        remaining = current_user.get_remaining_debates()
        if remaining <= 0:
            return jsonify({
                'error': {
                    'code': 'daily_limit_reached',
                    'message': 'You have used all your debates for today. Resets at midnight UTC.'
                },
                'remaining_debates': 0
            }), 429

        # Create debate with user_id
        debate = debate_service.create_debate(
            market_id=market_id,
            model_ids=model_ids,
            rounds=rounds,
            user_id=current_user.id
        )

        # Increment daily debate count
        # Re-fetch user to ensure it's attached to current session
        db = get_db()
        user = db.query(User).filter(User.id == current_user.id).first()
        user.increment_debate_count()
        db.commit()

        return jsonify(debate), 201

    except ValueError as e:
        return jsonify({
            'error': {
                'code': 'invalid_request',
                'message': str(e)
            }
        }), 400
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(e)
            }
        }), 500


@debate_bp.route('/debate/<debate_id>', methods=['GET'])
def get_debate(debate_id):
    """GET /api/debate/<debate_id> - Get debate details"""
    try:
        debate = debate_service.get_debate(debate_id)

        if not debate:
            return jsonify({
                'error': {
                    'code': 'debate_not_found',
                    'message': f'Debate {debate_id} not found'
                }
            }), 404

        return jsonify(debate), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(e)
            }
        }), 500


@debate_bp.route('/debate/<debate_id>/stream', methods=['GET'])
def stream_debate(debate_id):
    """GET /api/debate/<debate_id>/stream - Stream debate events via SSE"""

    def generate():
        """Generate SSE events for the debate"""
        # Check if debate exists
        debate = debate_service.get_debate(debate_id)
        if not debate:
            error_data = {
                'error': 'Debate not found',
                'message': f'Debate with ID {debate_id} was not found'
            }
            # Avoid using reserved SSE event name "error" to prevent confusion with connection errors.
            yield f"event: debate_error\ndata: {json.dumps(error_data)}\n\n"
            return

        # Create new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Create event queue for this stream (after setting event loop)
        event_queue = asyncio.Queue()

        # Start the debate in the background
        async def run_debate_and_stream():
            """Run debate and put events in queue"""
            try:
                await debate_service.run_debate(debate_id, event_queue)
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                logger.error(f"Unhandled exception in debate stream: {error_trace}")
                try:
                    error_data = {
                        'error': f"{type(e).__name__}: {str(e)}",
                        'message': f"Unhandled exception in debate stream: {str(e)}",
                        'traceback': error_trace if config.DEBUG else None
                    }
                    await event_queue.put({
                        'event': 'error',
                        'data': error_data
                    })
                except Exception as queue_error:
                    logger.error(f"Failed to send error event to queue: {queue_error}")
            finally:
                # Signal completion
                try:
                    await event_queue.put(None)
                except Exception:
                    pass  # Queue might be closed

        # Start debate task
        debate_task = loop.create_task(run_debate_and_stream())

        try:
            # Stream events as they come
            while True:
                try:
                    # Get event from queue with timeout for keepalive
                    event = loop.run_until_complete(
                        asyncio.wait_for(event_queue.get(), timeout=5.0)
                    )

                    # None signals completion
                    if event is None:
                        break

                    # Format as SSE
                    event_type_raw = event.get('event', 'message')
                    # Avoid using reserved SSE event name "error" to prevent confusion with connection errors.
                    event_type = 'debate_error' if event_type_raw == 'error' else event_type_raw
                    event_data_obj = event.get('data', {})
                    
                    # Ensure error events always have meaningful data
                    if event_type_raw == 'error':
                        # Skip empty error events entirely
                        if not event_data_obj:
                            logger.warning(f"Skipping empty error event (None): {event}")
                            continue
                        if not isinstance(event_data_obj, dict):
                            logger.warning(f"Skipping invalid error event (not dict): {event}")
                            continue

                        # Check if event_data_obj is actually empty (no keys or all values are empty)
                        if not event_data_obj or (len(event_data_obj) == 0):
                            logger.warning(f"Skipping empty error event (empty dict): {event}")
                            continue

                        # Get error and message, filter out empty strings
                        error_msg = event_data_obj.get('error', '').strip() if event_data_obj.get('error') else ''
                        message_msg = event_data_obj.get('message', '').strip() if event_data_obj.get('message') else ''

                        # Check all string values to see if any are non-empty
                        has_content = False
                        for key, value in event_data_obj.items():
                            if value and (isinstance(value, str) and value.strip()) or (not isinstance(value, str) and value):
                                has_content = True
                                break

                        if not has_content and not error_msg and not message_msg:
                            logger.warning(f"Skipping empty error event (no content): {event}")
                            continue

                        # Ensure at least one field is present with non-empty value
                        if not error_msg:
                            event_data_obj['error'] = message_msg or 'Unknown error occurred'
                        if not message_msg:
                            event_data_obj['message'] = error_msg or 'Unknown error occurred'
                    
                    event_data = json.dumps(event_data_obj)
                    yield f"event: {event_type}\ndata: {event_data}\n\n"

                except asyncio.TimeoutError:
                    # Check if debate task is done
                    if debate_task.done():
                        # Get any exception that occurred
                        try:
                            debate_task.result()
                        except Exception as e:
                            error_data = {
                                'error': f'Debate task failed: {str(e)}',
                                'message': f'The debate task encountered an error: {str(e)}'
                            }
                            yield f"event: debate_error\ndata: {json.dumps(error_data)}\n\n"
                        break
                    # Send keepalive and continue waiting
                    yield ": keepalive\n\n"
                    continue

        except Exception as e:
            error_data = {
                'error': str(e),
                'message': f'Stream error: {str(e)}'
            }
            yield f"event: debate_error\ndata: {json.dumps(error_data)}\n\n"
        finally:
            # Cleanup
            if not debate_task.done():
                debate_task.cancel()
            loop.close()

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


@debate_bp.route('/debate/<debate_id>/results', methods=['GET'])
def get_debate_results(debate_id):
    """GET /api/debate/<debate_id>/results - Get debate results with summary"""
    try:
        results = debate_service.get_debate_results(debate_id)

        if not results:
            return jsonify({
                'error': {
                    'code': 'debate_not_found_or_incomplete',
                    'message': f'Debate {debate_id} not found or not yet completed'
                }
            }), 404

        return jsonify(results), 200

    except Exception as e:
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(e)
            }
        }), 500


@debate_bp.route('/debates/<debate_id>', methods=['DELETE'])
@require_auth
def delete_debate(current_user, debate_id):
    """
    DELETE /api/debates/:id - Soft delete a debate

    Args:
        current_user: Current authenticated user (from @require_auth)
        debate_id: Debate ID to delete

    Returns:
        200: Debate deleted successfully
        403: User not authorized to delete this debate
        404: Debate not found
        500: Server error
    """
    try:
        user_id = current_user.id
        db = get_db()

        # Get debate
        debate = db.query(DebateDB).filter_by(debate_id=debate_id).first()

        if not debate:
            return jsonify({
                'error': {
                    'code': 'not_found',
                    'message': 'Debate not found'
                }
            }), 404

        # Check if user owns this debate
        if debate.user_id != user_id:
            return jsonify({
                'error': {
                    'code': 'unauthorized',
                    'message': 'You can only delete your own debates'
                }
            }), 403

        # Soft delete
        debate.is_deleted = True
        db.commit()

        logger.info(f"Debate {debate_id} soft deleted by user {user_id}")

        return jsonify({
            'message': 'Debate deleted successfully',
            'debate_id': debate_id
        }), 200

    except Exception as e:
        logger.error(f"Error deleting debate: {e}", exc_info=True)
        db.rollback()
        return jsonify({
            'error': {
                'code': 'internal_error',
                'message': str(e)
            }
        }), 500


@debate_bp.route('/debate/audio/status', methods=['GET'])
def get_audio_status():
    """GET /api/debate/audio/status - Check ElevenLabs audio generation status"""
    try:
        has_audio = True
        error_message = None
        
        if not config.ELEVENLABS_API_KEY:
            has_audio = False
            error_message = "ElevenLabs API key not configured"
        else:
            # Check if we can make a simple API call to check quota
            import aiohttp
            import asyncio
            
            async def check_quota():
                try:
                    async with aiohttp.ClientSession() as session:
                        headers = {
                            "xi-api-key": config.ELEVENLABS_API_KEY
                        }
                        # Try to get user info - this will fail if quota is exceeded or key is invalid
                        async with session.get(
                            "https://api.elevenlabs.io/v1/user",
                            headers=headers,
                            timeout=aiohttp.ClientTimeout(total=5)
                        ) as response:
                            if response.status == 401:
                                error_text = await response.text()
                                if 'quota_exceeded' in error_text:
                                    return False, "ElevenLabs quota exceeded - no audio available"
                                else:
                                    return False, "ElevenLabs API key invalid"
                            elif response.status == 200:
                                # Check if user has credits
                                user_data = await response.json()
                                subscription = user_data.get('subscription', {})
                                if subscription.get('tier') == 'free' and subscription.get('character_count', 0) >= subscription.get('character_limit', 0):
                                    return False, "ElevenLabs free tier quota exceeded"
                                return True, None
                            else:
                                return False, f"ElevenLabs API error: {response.status}"
                except Exception as e:
                    logger.error(f"Error checking ElevenLabs status: {e}")
                    # If we can't check, assume audio is available (optimistic)
                    return True, None
            
            # Run the async check
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            has_audio, error_message = loop.run_until_complete(check_quota())
            loop.close()
        
        return jsonify({
            'has_audio': has_audio,
            'error': error_message
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking audio status: {e}")
        # On error, assume audio is available (optimistic)
        return jsonify({
            'has_audio': True,
            'error': None
        }), 200
