import axios from 'axios'

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000'
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'powerful-internal-secret-change-in-prod'

export async function triggerReview(payload: {
    job_id: string;
    repo: string;
    pr_number: number;
    installation_id: number;
}) {
    const response = await axios.post(`${AGENT_URL}/review`, payload, {
        headers: { 'x-internal-secret': INTERNAL_SERVICE_KEY },
        timeout: 300000 
    })
    return response.data;
}

export async function sendFeedbackToAgent(payload: {
    org_id: string;
    repo_id: string;
    pr_number: number;
    file_path?: string | null;
    line?: number | null;
    severity?: string | null;
    comment: string;
    action: 'approve' | 'dismiss';
}) {
    const response = await axios.post(`${AGENT_URL}/memory/learn`, payload, {
        headers: { 'x-internal-secret': INTERNAL_SERVICE_KEY },
        timeout: 15000
    });
    return response.data;
}
