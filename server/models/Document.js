import React, { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import debounce from 'lodash.debounce';
import './App.css'; // Import CSS file

const socket = io('http://localhost:5000'); // Connect to backend

const DocumentEditor = () => {
  const [documents, setDocuments] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState(null); // Error state for better feedback

  // Fetch documents on load
  useEffect(() => {
    axios.get('http://localhost:5000/documents')
      .then(res => setDocuments(res.data))
      .catch(err => {
        console.error('Error fetching docs:', err);
        setError('Failed to load documents. Please try again later.');
      });
  }, []);

  // Listen for real-time changes
  useEffect(() => {
    const handleReceiveChanges = (data) => {
      if (data.id === currentDoc?._id) {
        setContent(data.content);
      }
    };

    socket.on('receive-changes', handleReceiveChanges);
    return () => socket.off('receive-changes', handleReceiveChanges);
  }, [currentDoc]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce((id, updatedContent) => {
      axios.put(`http://localhost:5000/documents/${id}`, { content: updatedContent })
        .then(() => console.log('Document saved successfully'))
        .catch(err => {
          console.error('Error saving document:', err);
          setError('Failed to save document. Please try again.');
        });
    }, 1000),
    []
  );

  // Handle content change
  const handleContentChange = (e) => {
    const updatedContent = e.target.value;
    setContent(updatedContent);

    // Emit changes in real-time
    if (currentDoc) {
      socket.emit('send-changes', { id: currentDoc._id, content: updatedContent });

      // Debounced auto-save to backend
      debouncedSave(currentDoc._id, updatedContent);
    }
  };

  return (
    <div className="App"> {/* Use App class for consistent styling */}
      <h1>📄 Real-Time Collaborative Document Editor</h1>
      {error && <p className="error">{error}</p>} {/* Display error message */}
      <div className="editor-container">
        {/* Document List */}
        <div className="document-list">
          <h2>Documents List:</h2>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <button
                key={doc._id}
                onClick={() => {
                  setCurrentDoc(doc);
                  setContent(doc.content);
                  setError(null); // Clear error when selecting a document
                }}
                className="document-button"
              >
                {doc.title}
              </button>
            ))
          ) : (
            <p>No documents available.</p>
          )}
        </div>

        {/* Editor */}
        <div className="editor">
          {currentDoc ? (
            <>
              <h2>{currentDoc.title}</h2>
              <textarea
                value={content}
                onChange={handleContentChange}
                rows={20}
                cols={60}
                className="editor-textarea"
                placeholder="Start typing here..."
              />
            </>
          ) : (
            <p>📋 Select a document to start editing.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;