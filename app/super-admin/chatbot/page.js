'use client';

import { useState, useEffect } from 'react';
import SuperAdminLayout from '../../../components/SuperAdminLayout';

export default function ChatbotManagementPage() {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
      if (!res.ok) throw new Error(editingQuestion ? 'Failed to update question' : 'Failed to add question');
      await fetchQuestions();
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
        await fetchQuestions();
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
        <h1 className="page-title">Chatbot Management</h1>
        {error && <p className="error-message">{error}</p>}

        {/* Form Section */}
        <div className="form-card">
          <h2 className="section-heading">{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
          <form onSubmit={handleSubmit} className="question-form">
            <select
              name="category"
              value={formState.category}
              onChange={handleInputChange}
              className="input-select"
              required
            >
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
              className="input-field"
              required
            />
            <textarea
              name="answer"
              placeholder="Answer"
              value={formState.answer}
              onChange={handleInputChange}
              className="textarea"
              required
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showBookNowButton"
                checked={formState.showBookNowButton}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <span className="checkbox-text">Show "Book Now" button with answer</span>
            </label>
            <div className="button-group">
              <button type="submit" className="btn-primary">{editingQuestion ? 'Update' : 'Add'}</button>
              {editingQuestion && (
                <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* Questions List */}
        <div className="list-card">
          <h2 className="section-heading">Existing Questions</h2>
          {isLoading ? (
            <p className="loading-text">Loading questions...</p>
          ) : (
            <table className="questions-table">
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
                    <td className="category-cell">{q.category}</td>
                    <td className="question-cell">{q.question}</td>
                    <td className="actions-cell">
                      <button className="action-btn edit" onClick={() => handleEdit(q)}>Edit</button>
                      <button className="action-btn delete" onClick={() => handleDelete(q.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Minimal CSS for consistent sizing and spacing */}
      <style jsx>{`
        .container {
          max-width: 1200px; /* wider for more breathing room */
          margin: 0 auto;
          padding: 40px 20px;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #222;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 30px;
          letter-spacing: 0.02em;
        }

        .section-heading {
          font-size: 1.75rem;
          margin-bottom: 15px;
          font-weight: 600;
          color: #444;
        }

        /* Error message */
        .error-message {
          color: #e5484d;
          font-weight: 600;
          margin-bottom: 20px;
          text-align: center;
        }

        /* Cards (form & list) */
        .form-card, .list-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.07);
          padding: 30px 40px;
          margin-bottom: 40px;
          transition: box-shadow 0.3s ease;
        }

        /* Add hover effect for depth */
        .form-card:hover, .list-card:hover {
          box-shadow: 0 12px 30px rgba(0,0,0,0.1);
        }

        /* Form styles */
        .question-form {
          display: flex;
          flex-direction: column;
          gap: 20px; /* consistent spacing between inputs */
        }

        .input-select, .input-field, .textarea {
          width: 100%;
          padding: 14px 18px;
          border-radius: 10px;
          border: 1px solid #ddd;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        /* Focus styles */
        .input-select:focus, .input-field:focus, .textarea:focus {
          border-color: #6c63ff;
          box-shadow: 0 0 8px rgba(108, 99, 255, 0.2);
          outline: none;
        }

        /* Label & checkbox styles */
        .checkbox-label {
          display: flex;
          align-items: center;
          font-size: 0.95rem;
        }

        .checkbox-input {
          margin-right: 10px;
        }

        /* Buttons layout */
        .button-group {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }

        /* Primary button styling */
        .btn-primary {
          background: linear-gradient(135deg, #febe52, #EBD591);
          color: #fff;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #EBD591, #EB7407);
          transform: translateY(-2px);
        }

        /* Secondary button styling */
        .btn-secondary {
          background-color: #bbb;
          color: #fff;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background-color: #999;
          transform: translateY(-2px);
        }

        /* Table styles */
        .questions-table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background-color: #f0f0f0;
          padding: 16px;
          font-weight: 600;
          font-size: 0.95rem;
          text-align: left;
        }

        td {
          padding: 14px;
          border-bottom: 1px solid #eee;
        }

        .category-cell {
          font-weight: 600;
          color: #555;
        }

        .question-cell {
          color: #333;
        }

        /* Action buttons in table */
        .actions-cell {
          display: flex;
          gap: 10px;
        }

        .action-btn {
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .edit {
          background-color: #4a90e2;
          color: #fff;
        }

        .edit:hover {
          background-color: #357ab8;
          transform: translateY(-1px);
        }

        .delete {
          background-color: #e5484d;
          color: #fff;
        }

        .delete:hover {
          background-color: #c14444;
          transform: translateY(-1px);
        }

        /* Loading text */
        .loading-text {
          text-align: center;
          font-style: italic;
          color: #777;
          margin-top: 20px;
        }
      `}</style>
    </SuperAdminLayout>
  );
}