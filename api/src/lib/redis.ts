import Redis from "ioredis";

const connection = new (Redis as any)(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null // required by BullMQ
})

connection.on('connect', () => console.log('Redis connected'))
connection.on('error', (err: any) => console.error('Redis error:', err))

export default connection