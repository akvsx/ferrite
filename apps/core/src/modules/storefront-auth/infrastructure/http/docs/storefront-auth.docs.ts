import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const LoginUserDocs = () =>
	applyDecorators(
		ApiOperation({ summary: 'Login a storefront user' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description:
				'Successfully logged in. Returns user profile and sets session cookie.',
			schema: {
				type: 'object',
				properties: {
					step: { type: 'string', example: 'authenticated' },
					user: {
						type: 'object',
						properties: {
							id: { type: 'string', format: 'uuid' },
							storeId: { type: 'string', format: 'uuid' },
							email: { type: 'string', format: 'email' },
							displayName: { type: 'string', nullable: true },
							mfaEnabled: { type: 'boolean' },
							metadata: { type: 'object' },
							createdAt: { type: 'string', format: 'date-time' },
							updatedAt: { type: 'string', format: 'date-time' },
							emailVerified: { type: 'boolean' },
						},
					},
				},
			},
		}),
		ApiResponse({
			status: 401,
			description: 'Invalid credentials.',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 401 },
					message: { type: 'string', example: 'Invalid email or password' },
					error: { type: 'string', example: 'Unauthorized' },
				},
			},
		})
	);

export const LogoutDocs = () =>
	applyDecorators(
		ApiOperation({ summary: 'Logout a storefront user' }),
		ApiResponse({
			status: 200,
			description: 'Successfully logged out. Clears session cookie.',
			schema: {
				type: 'object',
				properties: {
					step: { type: 'string', example: 'logged_out' },
				},
			},
		})
	);

export const LogoutAllDocs = () =>
	applyDecorators(
		ApiOperation({ summary: 'Logout a storefront user from all devices' }),
		ApiResponse({
			status: 200,
			description:
				'Successfully logged out from all devices. Clears session cookie.',
			schema: {
				type: 'object',
				properties: {
					step: { type: 'string', example: 'logged_out_all' },
				},
			},
		})
	);

export const GetSessionDocs = () =>
	applyDecorators(
		ApiOperation({ summary: 'Get current session' }),
		ApiResponse({
			status: 200,
			description: 'Successfully retrieved current session and user.',
		}),
		ApiResponse({
			status: 401,
			description: 'Unauthorized (session invalid or missing).',
		})
	);

export const GetSessionsDocs = () =>
	applyDecorators(
		ApiOperation({ summary: 'Get all active sessions for the current user' }),
		ApiResponse({
			status: 200,
			description: 'Successfully retrieved all active sessions.',
		}),
		ApiResponse({
			status: 401,
			description: 'Unauthorized.',
		})
	);

export const RegisterUserDocs = () =>
	applyDecorators(
		ApiOperation({ summary: 'Register a new storefront user' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiResponse({
			status: 201,
			description:
				'User successfully registered. Returns the new user profile and next auth step.',
			schema: {
				type: 'object',
				properties: {
					step: { type: 'string', example: 'email_verification_required' },
					user: {
						type: 'object',
						properties: {
							id: { type: 'string', format: 'uuid' },
							storeId: { type: 'string', format: 'uuid' },
							email: { type: 'string', format: 'email' },
							displayName: { type: 'string', nullable: true },
							mfaEnabled: { type: 'boolean' },
							metadata: { type: 'object' },
							createdAt: { type: 'string', format: 'date-time' },
							updatedAt: { type: 'string', format: 'date-time' },
							emailVerified: { type: 'boolean' },
						},
					},
				},
			},
		}),
		ApiResponse({
			status: 400,
			description: 'Validation failed or bad request.',
		}),
		ApiResponse({
			status: 422,
			description: 'Unprocessable Entity (e.g. email already exists).',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 422 },
					message: { type: 'string', example: 'Email already exists' },
					error: { type: 'string', example: 'Unprocessable Entity' },
				},
			},
		}),
		ApiResponse({
			status: 500,
			description:
				'Internal Server Error (e.g. Incomplete store configuration).',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 500 },
					message: {
						type: 'string',
						example: 'Incomplete store configuration',
					},
					error: { type: 'string', example: 'Internal Server Error' },
				},
			},
		})
	);

export const VerifyEmailDocs = () =>
	applyDecorators(
		ApiOperation({
			summary: 'Verify storefront user email address using verification token',
		}),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description: 'Email verified successfully.',
			schema: {
				type: 'object',
				properties: {
					step: { type: 'string', example: 'email_verified' },
				},
			},
		}),
		ApiResponse({
			status: 400,
			description: 'Validation failed or bad request.',
		}),
		ApiResponse({
			status: 422,
			description:
				'Unprocessable Entity (e.g. invalid or expired verification token).',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 422 },
					message: { type: 'string', example: 'Invalid token' },
					error: { type: 'string', example: 'Unprocessable Entity' },
				},
			},
		}),
		ApiResponse({
			status: 429,
			description: 'Too many verification attempts (rate limit exceeded).',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 429 },
					message: {
						type: 'string',
						example: 'Too many verification attempts',
					},
					error: { type: 'string', example: 'Too Many Requests' },
				},
			},
		}),
		ApiResponse({
			status: 500,
			description:
				'Internal Server Error (e.g. Incomplete store configuration).',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 500 },
					message: {
						type: 'string',
						example: 'Incomplete store configuration',
					},
					error: { type: 'string', example: 'Internal Server Error' },
				},
			},
		})
	);

export const ResendVerificationEmailDocs = () =>
	applyDecorators(
		ApiOperation({ summary: 'Resend verification email to a storefront user' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description: 'Verification email sent successfully.',
			schema: {
				type: 'object',
				properties: {
					step: { type: 'string', example: 'email_verification_required' },
				},
			},
		}),
		ApiResponse({
			status: 400,
			description: 'Validation failed or bad request.',
		}),
		ApiResponse({
			status: 422,
			description:
				'Unprocessable Entity (e.g. user not found or already verified).',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 422 },
					message: { type: 'string', example: 'User not found' },
					error: { type: 'string', example: 'Unprocessable Entity' },
				},
			},
		}),
		ApiResponse({
			status: 429,
			description:
				'Too many verification attempts or cooldown period has not elapsed.',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 429 },
					message: {
						type: 'string',
						example: 'Too many verification attempts',
					},
					error: { type: 'string', example: 'Too Many Requests' },
				},
			},
		}),
		ApiResponse({
			status: 500,
			description:
				'Internal Server Error (e.g. Incomplete store configuration).',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 500 },
					message: {
						type: 'string',
						example: 'Incomplete store configuration',
					},
					error: { type: 'string', example: 'Internal Server Error' },
				},
			},
		})
	);
