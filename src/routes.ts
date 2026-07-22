import { Router } from 'express'
import { register, login, me, createApplication, getApplications, getApplicationById, updateApplication, deleteApplication, getDashboardStats } from './controllers'
import { requireAuth } from './middleware'

const router = Router()

// ---------- Health check ----------
router.get('/health', (_req, res) => {
  res
    .status(200)
    .json({ status: 'ok', message: 'CareerTrack Lite API is running.' })
})

// ---------- Auth routes ----------
router.post('/auth/register', register)
router.post('/auth/login', login)
router.get('/auth/me', requireAuth, me)
router.post('/applications', requireAuth, createApplication)
router.get('/applications', requireAuth, getApplications)
router.get('/applications/:id', requireAuth, getApplicationById)
router.put('/applications/:id', requireAuth, updateApplication)
router.delete('/applications/:id', requireAuth, deleteApplication)
router.get('/dashboard/stats', requireAuth, getDashboardStats)

export default router
