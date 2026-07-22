import { Request, Response } from 'express'
import { prisma, hashPassword, comparePassword, signToken } from './utils'
import { AuthRequest } from './type'

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, image } = req.body

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Name, email and password are required.' })
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters.' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists.' })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: { name, email, passwordHash, image: image || null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    })

    const token = signToken({ userId: user.id })

    return res.status(201).json({ user, token })
  } catch (err) {
    console.error('Register error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = signToken({ userId: user.id })

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
      },
      token,
    })
  } catch (err) {
    console.error('Login error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}

export async function me(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    })

    if (!user) return res.status(404).json({ error: 'User not found.' })

    return res.status(200).json({ user })
  } catch (err) {
    console.error('Me error:', err)
    return res.status(500).json({ error: 'Something went wrong.' })
  }
}

export async function createApplication(req: AuthRequest, res: Response) {
  try {
    const {
      companyName,
      jobTitle,
      jobUrl,
      source,
      status,
      applicationDate,
      notes,
    } = req.body

    if (!companyName || !jobTitle || !source || !applicationDate) {
      return res.status(400).json({
        error:
          'companyName, jobTitle, source and applicationDate are required.',
      })
    }

    const application = await prisma.application.create({
      data: {
        userId: req.userId!,
        companyName,
        jobTitle,
        jobUrl: jobUrl || null,
        source,
        status: status || 'Saved',
        applicationDate: new Date(applicationDate),
        notes: notes || null,
      },
    })

    return res.status(201).json({ application })
  } catch (err) {
    console.error('Create application error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}

// ---------- Get all applications (নিজেরটাই শুধু, + search/filter/sort) ----------
export async function getApplications(req: AuthRequest, res: Response) {
  try {
    const {
      search,
      status,
      source,
      sortBy = 'applicationDate',
      order = 'desc',
    } = req.query

    const where: any = { userId: req.userId! }

    if (search) {
      where.OR = [
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { jobTitle: { contains: String(search), mode: 'insensitive' } },
      ]
    }
    if (status) where.status = String(status)
    if (source) where.source = String(source)

    const allowedSortFields = [
      'applicationDate',
      'companyName',
      'createdAt',
      'status',
    ]
    const sortField = allowedSortFields.includes(String(sortBy))
      ? String(sortBy)
      : 'applicationDate'
    const sortOrder = order === 'asc' ? 'asc' : 'desc'

    const applications = await prisma.application.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
    })

    return res.status(200).json({ applications })
  } catch (err) {
    console.error('Get applications error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}

// ---------- Get one application (ownership check) ----------
export async function getApplicationById(req: AuthRequest, res: Response) {
  try {
    const id = String(req.params.id)

    const application = await prisma.application.findFirst({
      where: { id, userId: req.userId! },
    })

    if (!application) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    return res.status(200).json({ application })
  } catch (err) {
    console.error('Get application error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}

// ---------- Update application (ownership check) ----------
export async function updateApplication(req: AuthRequest, res: Response) {
  try {
    const id = String(req.params.id)
    const {
      companyName,
      jobTitle,
      jobUrl,
      source,
      status,
      applicationDate,
      notes,
    } = req.body

    const existing = await prisma.application.findFirst({
      where: { id, userId: req.userId! },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(jobUrl !== undefined && { jobUrl }),
        ...(source !== undefined && { source }),
        ...(status !== undefined && { status }),
        ...(applicationDate !== undefined && {
          applicationDate: new Date(applicationDate),
        }),
        ...(notes !== undefined && { notes }),
      },
    })

    return res.status(200).json({ application })
  } catch (err) {
    console.error('Update application error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}

// ---------- Delete application (ownership check) ----------
export async function deleteApplication(req: AuthRequest, res: Response) {
  try {
    const id = String(req.params.id)

    const existing = await prisma.application.findFirst({
      where: { id, userId: req.userId! },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    await prisma.application.delete({ where: { id } })

    return res
      .status(200)
      .json({ message: 'Application deleted successfully.' })
  } catch (err) {
    console.error('Delete application error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}
export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!

    const applications = await prisma.application.findMany({
      where: { userId },
      select: { status: true },
    })

    const statusCounts: Record<string, number> = {
      Saved: 0,
      Applied: 0,
      Assessment: 0,
      Interview: 0,
      Rejected: 0,
      Offer: 0,
    }
    applications.forEach((app) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
    })

    const recent = await prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return res.status(200).json({
      total: applications.length,
      statusCounts,
      recent,
    })
  } catch (err) {
    console.error('Dashboard stats error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.' })
  }
}