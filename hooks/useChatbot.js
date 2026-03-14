'use client';

import { useState, useEffect } from 'react';

export default function useChatbot(fallbackKeywordSuggestions = {}) {
  const [categories, setCategories] = useState([]);
  const [mergedKeywordSuggestions, setMergedKeywordSuggestions] = useState(fallbackKeywordSuggestions);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('hardcoded'); // 'hardcoded', 'database', or 'hybrid'

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/chatbot');
      if (!response.ok) {
        // API failed, use fallback hardcoded data
        console.warn('Chatbot API unavailable, using hardcoded fallback');
        setDataSource('hardcoded');
        setCategories(convertKeywordSuggestionsToCategories(fallbackKeywordSuggestions));
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Transform database data into keyword suggestions format
      const dbKeywordSuggestions = transformDatabaseToKeywordSuggestions(data);
      
      // Merge database responses with hardcoded (database takes priority)
      const merged = mergeKeywordSuggestions(fallbackKeywordSuggestions, dbKeywordSuggestions);
      setMergedKeywordSuggestions(merged);
      
      // Determine data source
      const hasDbData = Object.keys(dbKeywordSuggestions).length > 0;
      const hasHardcodedData = Object.keys(fallbackKeywordSuggestions).length > 0;
      
      if (hasDbData && hasHardcodedData) {
        setDataSource('hybrid');
      } else if (hasDbData) {
        setDataSource('database');
      } else {
        setDataSource('hardcoded');
      }
      
      // Transform merged data into categories format
      const formattedCategories = Object.entries(merged).map(([categoryKey, categoryData]) => ({
        name: categoryKey,
        icon: getCategoryIcon(categoryKey),
        questions: categoryData.suggestions || []
      }));
      
      setCategories(formattedCategories);
    } catch (err) {
      console.error('Chatbot fetch error:', err);
      setError(err.message);
      setDataSource('hardcoded');
      setCategories(convertKeywordSuggestionsToCategories(fallbackKeywordSuggestions));
    } finally {
      setIsLoading(false);
    }
  };

  // Transform database response into keywordSuggestions format
  const transformDatabaseToKeywordSuggestions = (dbData) => {
    const transformed = {};
    
    Object.entries(dbData).forEach(([categoryName, questions]) => {
      const categoryKey = categoryName.toLowerCase().replace(/\s+/g, '_');
      transformed[categoryKey] = {
        keywords: [], // Database doesn't provide keywords, use empty array
        suggestions: questions.map(q => ({
          id: q.id,
          text: q.question,
          answer: q.answer || '',
          showBookNow: q.hasBookNow || false,
          source: 'database'
        }))
      };
    });
    
    return transformed;
  };

  // Convert keywordSuggestions to categories format
  const convertKeywordSuggestionsToCategories = (keywordSuggestions) => {
    return Object.entries(keywordSuggestions).map(([categoryKey, categoryData]) => ({
      name: categoryKey,
      icon: getCategoryIcon(categoryKey),
      questions: (categoryData.suggestions || []).map(q => ({
        ...q,
        source: q.source || 'hardcoded'
      }))
    }));
  };

  // Merge hardcoded and database keyword suggestions
  // Database takes priority for matching IDs
  const mergeKeywordSuggestions = (hardcoded, database) => {
    const merged = { ...hardcoded };
    
    Object.entries(database).forEach(([categoryKey, dbCategoryData]) => {
      if (!merged[categoryKey]) {
        // New category from database
        merged[categoryKey] = dbCategoryData;
      } else {
        // Merge suggestions - database overrides hardcoded with same ID
        const hardcodedSuggestions = merged[categoryKey].suggestions || [];
        const dbSuggestions = dbCategoryData.suggestions || [];
        
        // Create a map of DB suggestions by ID for quick lookup
        const dbSuggestionsMap = {};
        dbSuggestions.forEach(s => {
          dbSuggestionsMap[s.id] = s;
        });
        
        // Override hardcoded with database versions
        const mergedSuggestions = hardcodedSuggestions.map(hardcodedSugg => {
          if (dbSuggestionsMap[hardcodedSugg.id]) {
            return dbSuggestionsMap[hardcodedSugg.id];
          }
          return { ...hardcodedSugg, source: 'hardcoded' };
        });
        
        // Add new database suggestions that don't exist in hardcoded
        dbSuggestions.forEach(dbSugg => {
          const existsInHardcoded = hardcodedSuggestions.some(h => h.id === dbSugg.id);
          if (!existsInHardcoded) {
            mergedSuggestions.push(dbSugg);
          }
        });
        
        merged[categoryKey] = {
          keywords: merged[categoryKey].keywords || [],
          suggestions: mergedSuggestions
        };
      }
    });
    
    return merged;
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
      // Try to get answer from merged keyword suggestions first
      for (const categoryData of Object.values(mergedKeywordSuggestions)) {
        const suggestion = categoryData.suggestions?.find(s => s.id === questionId);
        if (suggestion && suggestion.answer) {
          return suggestion.answer;
        }
      }
      
      // Fallback to API if not found in merged data
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
    mergedKeywordSuggestions,
    dataSource,
    isLoading,
    error,
    fetchAnswer,
  };
}