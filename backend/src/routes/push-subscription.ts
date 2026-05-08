import { Router, Request, Response } from "express"
import { prisma } from "../db.js"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const { endpoint, p256dh, auth, userAgent, userId } = req.body

    if (!endpoint || !userId) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const newSubscription = await prisma.pushSubscription.create({
      data: {
        userId: userId,
        endpoint,
        p256dh,
        auth,
        userAgent,
      },
    })

    res.status(201).json(newSubscription)
  } catch (error) {
    console.error("Push subscription error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

router.delete("/", async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body

    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint is required" })
    }

    await prisma.pushSubscription.delete({ where: { endpoint } })
    res.json({ message: "Subscription deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router