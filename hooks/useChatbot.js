'use client';

import { useState, useEffect } from 'react';

export default function useChatbot() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/chatbot');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      
      // Transform the data into the format we need
      const formattedCategories = Object.entries(data).map(([name, questions]) => ({
        name,
        icon: getCategoryIcon(name),
        questions: questions.map(q => ({
          id: q.id,
          text: q.question,
          showBookNow: q.hasBookNow
        }))
      }));
      
      setCategories(formattedCategories);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Room Types': '🏨',
      'Amenities': '🏊‍♂️',
      'Pricing': '💰',
      'Booking': '📅',
      'Policies': '📜',
      'Services': '🛎️',
      'Location': '📍',
      'Pets': '🐾'
    };
    return icons[category] || '❓';
  };

  const fetchAnswer = async (questionId) => {
    try {
      const response = await fetch(`/api/chatbot/${questionId}`);
      if (!response.ok) throw new Error('Failed to fetch answer');
      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error('Error fetching answer:', error);
      return 'Sorry, I could not fetch the answer. Please try again.';
    }
  };

  return {
    categories,
    isLoading,
    error,
    fetchAnswer,
  };
}