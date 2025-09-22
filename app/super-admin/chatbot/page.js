'use client';

import { useState, useEffect } from 'react';
import SuperAdminLayout from '../../../components/SuperAdminLayout';

export default function ChatbotManagementPage() {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formState, setFormState] = useState({
    question: '',
    answer: '',
    category: 'Rooms & Rates',
    showBookNowButton: false,
  });

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/chatbot');
      const data = await res.json();
      // Flatten the grouped data for easier management
      const flattened = Object.values(data).flat();
      setQuestions(flattened);
    } catch (e) {
      setError('Failed to load questions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormState({
      question: '',
      answer: '',
      category: 'Rooms & Rates',
      showBookNowButton: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingQuestion ? `/api/chatbot/${editingQuestion.id}` : '/api/chatbot';
    const method = editingQuestion ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });

      if (!res.ok) {
        throw new Error(editingQuestion ? 'Failed to update question' : 'Failed to add question');
      }

      await fetchQuestions(); // Refresh list
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormState({
      question: question.question,
      answer: question.answer,
      category: question.category,
      showBookNowButton: question.showBookNowButton,
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const res = await fetch(`/api/chatbot/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete question');
        await fetchQuestions(); // Refresh list
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const categories = [
    'Rooms & Rates',
    'Booking & Reservations',
    'Amenities & Activities',
    'Payments & Cancellations',
    'Location & Policies',
  ];

  return (
    <SuperAdminLayout activePage="chatbot">
      <div className="container">
        <h1>Chatbot Management</h1>
        {error && <p className="error">{error}</p>}

        <div className="form-container">
          <h2>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
          <form onSubmit={handleSubmit}>
            <select name="category" value={formState.category} onChange={handleInputChange} required>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              name="question"
              placeholder="Question"
              value={formState.question}
              onChange={handleInputChange}
              required
            />
            <textarea
              name="answer"
              placeholder="Answer"
              value={formState.answer}
              onChange={handleInputChange}
              required
            />
            <label>
              <input
                type="checkbox"
                name="showBookNowButton"
                checked={formState.showBookNowButton}
                onChange={handleInputChange}
              />
              Show "Book Now" button with answer
            </label>
            <div className="form-actions">
              <button type="submit">{editingQuestion ? 'Update' : 'Add'}</button>
              {editingQuestion && <button type="button" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="questions-list-container">
          <h2>Existing Questions</h2>
          {isLoading ? <p>Loading...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Question</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td>{q.category}</td>
                    <td>{q.question}</td>
                    <td className="actions">
                      <button onClick={() => handleEdit(q)}>Edit</button>
                      <button onClick={() => handleDelete(q.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style jsx>{`
        .container { padding: 20px; }
        h1, h2 { color: #333; }
        .error { color: red; }
        .form-container { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        form { display: flex; flex-direction: column; gap: 15px; }
        input[type="text"], textarea, select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        textarea { min-height: 100px; resize: vertical; }
        label { display: flex; align-items: center; gap: 8px; }
        .form-actions { display: flex; gap: 10px; }
        button { padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; background-color: #0070f3; color: white; }
        button[type="button"] { background-color: #666; }
        .questions-list-container table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f2f2f2; }
        .actions { display: flex; gap: 10px; }
        .actions button { padding: 5px 10px; font-size: 0.9em; }
        .actions button:last-child { background-color: #e5484d; }
      `}</style>
    </SuperAdminLayout>
  );
}