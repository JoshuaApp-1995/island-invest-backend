import { Router } from 'express';
import { 
  getListings, 
  getListingById, 
  getListingBySlug,
  createListing, 
  updateListing, 
  deleteListing 
} from '../controllers/listingsController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { addReview, getReviews } from '../controllers/reviewController';

const router = Router();

router.get('/', getListings);
router.get('/me', authMiddleware, getListings); // Reuse getListings with userId from token
router.get('/slug/:slug', getListingBySlug);
router.get('/:id', getListingById);
router.post('/', authMiddleware, createListing);
router.put('/:id', authMiddleware, updateListing);
router.delete('/:id', authMiddleware, deleteListing);

// Reviews
router.post('/:id/reviews', authMiddleware, addReview);
router.get('/:id/reviews', getReviews);

export default router;
