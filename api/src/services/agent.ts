import axios from 'axios'

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000'

export async function triggerReview(payload: {
    job_id: string;
    repo: string;
    pr_number: number;
    installation_id: number;
}) {
    const response = await axios.post(`${AGENT_URL}/review`, payload)
    return response.data;
}