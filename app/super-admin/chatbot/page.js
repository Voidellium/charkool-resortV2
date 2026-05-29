'use client';

import { useState, useEffect, useCallback } from 'react';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function ChatbotManagementPage() {
  const { success, error: toastError } = useToast();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const QUESTIONS_PER_PAGE = 6;

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formState, setFormState] = useState({
    question: '',
    answer: '',
    category: 'Rooms & Rates',
    showBookNowButton: false,
  });
  
  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, id: null });

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/chatbot');
      const data = await res.json();
      const flattened = Object.values(data).flat();
      setQuestions(flattened);
    } catch (e) {
      setError('Failed to load questions.');
      toastError('Failed to load chatbot questions', { title: 'Load Failed' });
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
      success(editingQuestion ? 'Chatbot question updated successfully' : 'Chatbot question added successfully', {
        title: editingQuestion ? 'Question Updated' : 'Question Added'
      });
    } catch (err) {
      setError(err.message);
      toastError(err.message, { title: 'Save Failed' });
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
    setDeleteConfirmModal({ show: true, id });
  };

  const confirmDelete = async () => {
    const id = deleteConfirmModal.id;
    setDeleteConfirmModal({ show: false, id: null });
    try {
      const res = await fetch(`/api/chatbot/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete question');
      await fetchQuestions();
      success('Chatbot question deleted successfully', { title: 'Question Deleted' });
    } catch (err) {
      setError(err.message);
      toastError(err.message, { title: 'Delete Failed' });
    }
  };

  const categories = [
    'Rooms & Rates',
    'Booking & Reservations',
    'Amenities & Activities',
    'Payments & Cancellations',
    'Location & Policies',
  ];

  // Pagination calculation
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const paginatedQuestions = questions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);

  // Reset to first page when questions change
  useEffect(() => {
    setCurrentPage(1);
  }, [questions.length]);

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 className="section-heading">Existing Questions ({questions.length} total)</h2>
            {totalPages > 1 && (
              <span style={{ color: '#666', fontSize: '0.9rem' }}>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
          {isLoading ? (
            <p className="loading-text">Loading questions...</p>
          ) : (
            <>
              <table className="questions-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Question</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuestions.map((q) => (
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  gap: '1rem'
                }}>
                  <span style={{
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    Showing {startIndex + 1}-{Math.min(startIndex + QUESTIONS_PER_PAGE, questions.length)} of {questions.length} questions
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: currentPage === 1 ? '#f9fafb' : 'white',
                        color: currentPage === 1 ? '#9ca3af' : '#374151',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Previous
                    </button>
                    
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              background: currentPage === page ? 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)' : 'white',
                              color: currentPage === page ? 'white' : '#374151',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              minWidth: '40px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: currentPage === totalPages ? '#f9fafb' : 'white',
                        color: currentPage === totalPages ? '#9ca3af' : '#374151',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #febe52 0%, #fcd34d 50%, #f6e27a 100%)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Trash2 size={48} color="#dc2626" />
            </div>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#5a3e00',
              fontSize: '20px',
              fontWeight: 'bold',
            }}>Delete Question?</h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#6b4a00',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>Are you sure you want to delete this question? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirmModal({ show: false, id: null })}
                style={{
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#6b7280'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#9ca3af'}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}