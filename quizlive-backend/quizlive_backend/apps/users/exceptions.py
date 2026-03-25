"""
Custom DRF exception handler.
Returns consistent JSON error shapes:
  {
    "error":   "Human-readable message",
    "details": { ... }   (optional — field-level validation errors)
  }
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Wrap DRF exceptions in a consistent envelope."""
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception — let Django handle it (500)
        return None

    # Flatten validation errors into a friendlier shape
    data = response.data
    if isinstance(data, dict):
        # DRF ValidationError — collect first message per field
        if 'non_field_errors' in data:
            message = data['non_field_errors'][0] if data['non_field_errors'] else 'Validation error.'
            response.data = {'error': str(message)}
        elif 'detail' in data:
            response.data = {'error': str(data['detail'])}
        else:
            # Field-level errors
            first_field = next(iter(data))
            first_msg   = data[first_field]
            if isinstance(first_msg, list):
                first_msg = first_msg[0]
            response.data = {
                'error':   str(first_msg),
                'details': data,
            }
    elif isinstance(data, list):
        response.data = {'error': str(data[0]) if data else 'Error.'}

    return response
