import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'bml-secret-key-change-in-production';
const JWT_EXPIRATION = '24h';

// For development - simple password
// For production - use environment variable with hashed password
const MONITOR_PASSWORD = process.env.MONITOR_PASSWORD || 'bml2025';

// Optional: Hashed password for production
// Generate with: bcrypt.hashSync('bml2025', 10)
const MONITOR_PASSWORD_HASH = process.env.MONITOR_PASSWORD_HASH || null;

/**
 * Authenticate lab monitor
 * POST /api/auth/monitor
 */
export const authenticateMonitor = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    let isValid = false;

    // If using hashed password (production)
    if (MONITOR_PASSWORD_HASH) {
      isValid = await bcrypt.compare(password, MONITOR_PASSWORD_HASH);
    } else {
      // Development: simple comparison
      isValid = password === MONITOR_PASSWORD;
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        role: 'monitor',
        type: 'lab_monitor',
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    return res.json({
      success: true,
      token,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Verify monitor token (for testing)
 * GET /api/auth/verify
 */
export const verifyToken = (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    return res.json({
      success: true,
      message: 'Token is valid',
      decoded
    });

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};