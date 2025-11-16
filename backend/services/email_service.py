"""
Email service with support for Gmail SMTP, SendGrid, generic SMTP, and mock mode
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from utils.logger import get_auth_logger

logger = get_auth_logger()


class EmailService:
    """Email service for sending verification codes"""

    def __init__(self, config):
        """Initialize email service with configuration"""
        self.config = config
        self.service = config.EMAIL_SERVICE.lower()

    def send_verification_email(
        self,
        to_email: str,
        code: str,
        code_type: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Send verification email

        Args:
            to_email: Recipient email address
            code: Verification code
            code_type: Type of code (signup or login)
            user_name: User's name (for signup emails)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Get subject and body based on code type
            if code_type == 'signup':
                subject = self._render_template(self.config.SIGNUP_EMAIL_SUBJECT, {
                    'app_name': self.config.APP_NAME
                })
                body_html, body_text = self._get_signup_email_body(code, to_email, user_name)
            else:  # login
                subject = self._render_template(self.config.LOGIN_EMAIL_SUBJECT, {
                    'app_name': self.config.APP_NAME
                })
                body_html, body_text = self._get_login_email_body(code, to_email, user_name)

            # Send email based on service type
            if self.service == 'mock':
                return self._send_mock(to_email, subject, body_text, code)
            elif self.service == 'gmail':
                return self._send_gmail(to_email, subject, body_html, body_text)
            elif self.service == 'sendgrid':
                return self._send_sendgrid(to_email, subject, body_html, body_text)
            elif self.service == 'smtp':
                return self._send_smtp(to_email, subject, body_html, body_text)
            else:
                logger.error(f"Unknown email service: {self.service}")
                return False

        except Exception as e:
            logger.log_email_sent(to_email, success=False, error=str(e))
            logger.exception(f"Email send exception details")  # Print full traceback

            # Fallback: log code to console if email fails
            if self.config.EMAIL_FALLBACK_TO_CONSOLE:
                print(f"\n{'='*60}")
                print(f"EMAIL SEND FAILED - VERIFICATION CODE FOR {to_email}")
                print(f"Code: {code}")
                print(f"Type: {code_type}")
                print(f"{'='*60}\n")
                logger.warning(
                    f"Email failed, verification code logged to console",
                    email=to_email,
                    code_type=code_type
                )

            return False

    def _send_mock(self, to_email: str, subject: str, body: str, code: str) -> bool:
        """Mock email sending (prints to console)"""
        print(f"\n{'='*60}")
        print(f"MOCK EMAIL")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"{'='*60}")
        print(body)
        print(f"{'='*60}")
        print(f"Verification Code: {code}")
        print(f"{'='*60}\n")

        logger.log_email_sent(to_email, success=True, service='mock')
        return True

    def _send_gmail(self, to_email: str, subject: str, body_html: str, body_text: str) -> bool:
        """Send email via Gmail SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.config.EMAIL_FROM_NAME} <{self.config.EMAIL_FROM_ADDRESS}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            # Attach both plain text and HTML versions
            part1 = MIMEText(body_text, 'plain')
            part2 = MIMEText(body_html, 'html')
            msg.attach(part1)
            msg.attach(part2)

            # Connect to Gmail SMTP
            with smtplib.SMTP(self.config.SMTP_HOST, self.config.SMTP_PORT) as server:
                server.starttls()
                server.login(self.config.GMAIL_USER, self.config.GMAIL_APP_PASSWORD)
                server.send_message(msg)

            logger.log_email_sent(to_email, success=True, service='gmail')
            return True

        except Exception as e:
            logger.log_email_sent(to_email, success=False, error=str(e), service='gmail')
            raise

    def _send_sendgrid(self, to_email: str, subject: str, body_html: str, body_text: str) -> bool:
        """Send email via SendGrid"""
        try:
            message = Mail(
                from_email=(self.config.EMAIL_FROM_ADDRESS, self.config.EMAIL_FROM_NAME),
                to_emails=to_email,
                subject=subject,
                html_content=body_html,
                plain_text_content=body_text
            )

            sg = SendGridAPIClient(self.config.SENDGRID_API_KEY)
            response = sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.log_email_sent(to_email, success=True, service='sendgrid')
                return True
            else:
                logger.log_email_sent(
                    to_email,
                    success=False,
                    error=f"Status code: {response.status_code}",
                    service='sendgrid'
                )
                return False

        except Exception as e:
            logger.log_email_sent(to_email, success=False, error=str(e), service='sendgrid')
            raise

    def _send_smtp(self, to_email: str, subject: str, body_html: str, body_text: str) -> bool:
        """Send email via generic SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.config.EMAIL_FROM_NAME} <{self.config.EMAIL_FROM_ADDRESS}>"
            msg['To'] = to_email
            msg['Subject'] = subject

            part1 = MIMEText(body_text, 'plain')
            part2 = MIMEText(body_html, 'html')
            msg.attach(part1)
            msg.attach(part2)

            # Connect to SMTP server
            if self.config.SMTP_USE_TLS:
                with smtplib.SMTP(self.config.SMTP_HOST, self.config.SMTP_PORT) as server:
                    server.starttls()
                    server.login(self.config.SMTP_USERNAME, self.config.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP_SSL(self.config.SMTP_HOST, self.config.SMTP_PORT) as server:
                    server.login(self.config.SMTP_USERNAME, self.config.SMTP_PASSWORD)
                    server.send_message(msg)

            logger.log_email_sent(to_email, success=True, service='smtp')
            return True

        except Exception as e:
            logger.log_email_sent(to_email, success=False, error=str(e), service='smtp')
            raise

    def _get_signup_email_body(self, code: str, email: str, name: Optional[str]) -> tuple:
        """Get signup email body (HTML and text versions)"""
        # Load templates
        html_template = self._load_template('signup_email.html')
        text_template = self._load_template('signup_email.txt')

        # Template variables
        variables = {
            'code': code,
            'name': name or 'there',
            'email': email,
            'expiry_minutes': self.config.CODE_EXPIRATION_MINUTES,
            'app_name': self.config.APP_NAME,
            'app_url': self.config.APP_URL,
            'support_email': self.config.SUPPORT_EMAIL
        }

        html_body = self._render_template(html_template, variables)
        text_body = self._render_template(text_template, variables)

        return html_body, text_body

    def _get_login_email_body(self, code: str, email: str, name: Optional[str]) -> tuple:
        """Get login email body (HTML and text versions)"""
        html_template = self._load_template('login_email.html')
        text_template = self._load_template('login_email.txt')

        variables = {
            'code': code,
            'name': name or 'there',
            'email': email,
            'expiry_minutes': self.config.CODE_EXPIRATION_MINUTES,
            'app_name': self.config.APP_NAME,
            'app_url': self.config.APP_URL,
            'support_email': self.config.SUPPORT_EMAIL
        }

        html_body = self._render_template(html_template, variables)
        text_body = self._render_template(text_template, variables)

        return html_body, text_body

    def _load_template(self, template_name: str) -> str:
        """Load email template from file or use default"""
        if self.config.USE_TEMPLATE_FILES:
            template_path = f"{self.config.TEMPLATE_DIRECTORY}/{template_name}"
            try:
                with open(template_path, 'r') as f:
                    return f.read()
            except FileNotFoundError:
                logger.warning(f"Template file not found: {template_path}, using default")

        # Return default templates
        return self._get_default_template(template_name)

    def _get_default_template(self, template_name: str) -> str:
        """Get default email template"""
        defaults = {
            'signup_email.html': '''
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .code { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background-color: #f0f0f0; margin: 20px 0; letter-spacing: 5px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {app_name}!</h1>
        </div>
        <div class="content">
            <p>Hi {name},</p>
            <p>Thanks for signing up! Please use the verification code below to complete your registration:</p>
            <div class="code">{code}</div>
            <p>This code will expire in <strong>{expiry_minutes} minutes</strong>.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Need help? Contact us at {support_email}</p>
            <p>&copy; {app_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            ''',
            'signup_email.txt': '''
Welcome to {app_name}!

Hi {name},

Thanks for signing up! Please use the verification code below to complete your registration:

Verification Code: {code}

This code will expire in {expiry_minutes} minutes.

If you didn't request this code, please ignore this email.

Need help? Contact us at {support_email}

© {app_name}. All rights reserved.
            ''',
            'login_email.html': '''
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .code { font-size: 32px; font-weight: bold; color: #2196F3; text-align: center; padding: 20px; background-color: #f0f0f0; margin: 20px 0; letter-spacing: 5px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Login to {app_name}</h1>
        </div>
        <div class="content">
            <p>Hi there,</p>
            <p>Here's your verification code to log in:</p>
            <div class="code">{code}</div>
            <p>This code will expire in <strong>{expiry_minutes} minutes</strong>.</p>
            <p>If you didn't request this code, please ignore this email and consider changing your password.</p>
        </div>
        <div class="footer">
            <p>Need help? Contact us at {support_email}</p>
            <p>&copy; {app_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            ''',
            'login_email.txt': '''
Login to {app_name}

Hi there,

Here's your verification code to log in:

Verification Code: {code}

This code will expire in {expiry_minutes} minutes.

If you didn't request this code, please ignore this email.

Need help? Contact us at {support_email}

© {app_name}. All rights reserved.
            '''
        }
        return defaults.get(template_name, '')

    def _render_template(self, template: str, variables: dict) -> str:
        """Render template with variables"""
        result = template
        for key, value in variables.items():
            result = result.replace(f'{{{key}}}', str(value))
        return result
