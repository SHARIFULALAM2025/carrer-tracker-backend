import express from 'express'
import cors from 'cors'
import authRoutes from './routes'
import { errorHandler } from './middleware'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)

app.use(express.json())

app.use('/api', authRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use(errorHandler)

export default app
