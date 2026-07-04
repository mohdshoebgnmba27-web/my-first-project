import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get all restaurants
router.get('/restaurants', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ restaurants });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject restaurant
router.patch('/restaurants/:restaurantId/status', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      throw new AppError(400, 'isActive must be boolean');
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive },
      include: { subscription: true },
    });

    res.json({ restaurant });
  } catch (error) {
    next(error);
  }
});

// Get platform analytics
router.get('/analytics', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const totalRestaurants = await prisma.restaurant.count();
    const activeRestaurants = await prisma.restaurant.count({ where: { isActive: true } });
    const totalOrders = await prisma.order.count();
    const totalRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
    });

    res.json({
      totalRestaurants,
      activeRestaurants,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
