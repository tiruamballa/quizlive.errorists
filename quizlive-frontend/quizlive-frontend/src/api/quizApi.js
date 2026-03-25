import client from './client';

// ── Quiz CRUD ─────────────────────────────────────────────────────────────────
export const getQuizzes     = ()                  => client.get('/quizzes/');
export const getQuiz        = (id)                => client.get(`/quizzes/${id}/`);
export const createQuiz     = (data)              => client.post('/quizzes/', data);
export const updateQuiz     = (id, data)          => client.put(`/quizzes/${id}/`, data);
export const deleteQuiz     = (id)                => client.delete(`/quizzes/${id}/`);

// ── Question CRUD ─────────────────────────────────────────────────────────────
export const createQuestion = (quizId, data)      => client.post(`/quizzes/${quizId}/questions/`, data);
export const updateQuestion = (quizId, qId, data) => client.put(`/quizzes/${quizId}/questions/${qId}/`, data);
export const deleteQuestion = (quizId, qId)       => client.delete(`/quizzes/${quizId}/questions/${qId}/`);

// ── CSV Import ────────────────────────────────────────────────────────────────

/**
 * Parse and validate a CSV file server-side. Nothing is saved.
 * @param {File} file  — File object from <input type="file">
 * @returns { valid_count, error_count, questions, parse_errors }
 */
export const previewCSV = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/quizzes/csv/preview/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Commit a previewed import to the database.
 * @param {{ title, description, is_public, quiz_id?, questions }} payload
 * @returns { quiz_id, quiz_title, imported_count }
 */
export const importCSV = (payload) => client.post('/quizzes/csv/import/', payload);