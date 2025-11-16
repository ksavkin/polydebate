"""
Debate routes - AI debate endpoints
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context
import asyncio
import json
from services.debate import debate_service
from config import config

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
def start_debate():
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

        # Create debate
        debate = debate_service.create_debate(
            market_id=market_id,
            model_ids=model_ids,
            rounds=rounds
        )

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
            yield f"event: error\ndata: {json.dumps({'error': 'Debate not found'})}\n\n"
            return

        # Create event queue for this stream
        event_queue = asyncio.Queue()

        # Create new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Start the debate in the background
        async def run_debate_and_stream():
            """Run debate and put events in queue"""
            try:
                await debate_service.run_debate(debate_id, event_queue)
            except Exception as e:
                await event_queue.put({
                    'event': 'error',
                    'data': {'error': str(e)}
                })
            finally:
                # Signal completion
                await event_queue.put(None)

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
                    event_type = event.get('event', 'message')
                    event_data = json.dumps(event.get('data', {}))
                    yield f"event: {event_type}\ndata: {event_data}\n\n"

                except asyncio.TimeoutError:
                    # Check if debate task is done
                    if debate_task.done():
                        # Get any exception that occurred
                        try:
                            debate_task.result()
                        except Exception as e:
                            yield f"event: error\ndata: {json.dumps({'error': f'Debate task failed: {str(e)}'})}\n\n"
                        break
                    # Send keepalive and continue waiting
                    yield ": keepalive\n\n"
                    continue

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
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
