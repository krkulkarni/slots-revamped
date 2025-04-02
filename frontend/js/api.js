import { CONFIG } from './config.js';

const API_URL = CONFIG.API_BASE_URL;

/** Helper function for making API requests */
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            // Add any other headers like Authorization if needed
        },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        // console.log(`API Request: ${method} ${url}`, data ? data : ''); // Log request details
        const response = await fetch(url, options);

        if (!response.ok) {
            // Attempt to read error response body
            let errorBody;
            try {
                errorBody = await response.json();
            } catch (e) {
                errorBody = await response.text(); // Fallback to text if not JSON
            }
             console.error(`API Error Response (${response.status}):`, errorBody);
            throw new Error(`API request failed with status ${response.status}`);
        }

        // Handle cases with no response body (e.g., 204 No Content)
        if (response.status === 204) {
            return null;
        }

        const responseData = await response.json();
        // console.log(`API Response: ${method} ${url}`, responseData); // Log response details
        return responseData;

    } catch (error) {
        console.error(`Error during API request to ${url}:`, error);
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

/** Starts a new game session on the backend. */
export async function startSession(sessionData) {
    // Ensure data matches backend schema (schemas.SessionCreate)
    const payload = {
        player_id: sessionData.player_id,
        selected_cue: sessionData.selected_cue,
        phase_order: sessionData.phase_order, // Should be comma-separated string
        probability_sequence_id: sessionData.probability_sequence_id,
        rating_sequence_id: sessionData.rating_sequence_id
    };
    return await apiRequest('/session/start', 'POST', payload);
}

/** Logs trial data to the backend. */
export async function logTrialData(trialData) {
    // Ensure data matches backend schema (schemas.TrialCreate)
     const payload = {
        player_id: trialData.player_id, // Ensure player_id is included
        trial_number_global: trialData.trial_number_global,
        trial_number_phase: trialData.trial_number_phase,
        phase: trialData.phase,
        is_practice: trialData.is_practice,
        winning_cue_type: trialData.winning_cue_type,
        left_machine_prob: trialData.left_machine_prob,
        right_machine_prob: trialData.right_machine_prob,
        probability_switched_this_trial: trialData.probability_switched_this_trial,
        choice: trialData.choice,
        response_time_ms: trialData.response_time_ms,
        outcome: trialData.outcome,
        outcome_image: trialData.outcome_image // Keep for reference if needed, though not explicitly in schema
    };
    return await apiRequest('/trials/', 'POST', payload);
}

/** Logs rating data to the backend. */
export async function logRatingData(ratingData) {
     // Ensure data matches backend schema (schemas.RatingCreate)
     const payload = {
        player_id: ratingData.player_id, // Ensure player_id is included
        trial_number_before_rating: ratingData.trial_number_before_rating,
        rating_type: ratingData.rating_type,
        rating_value: ratingData.rating_value
    };
    return await apiRequest('/ratings/', 'POST', payload);
}

/** Marks a session as complete on the backend. */
export async function endSession(playerId) {
    if (!playerId) {
        console.error("Cannot end session: Player ID is missing.");
        return; // Or throw an error
    }
    // Backend expects PUT request with player_id in the path
    return await apiRequest(`/session/end/${playerId}`, 'PUT');
}