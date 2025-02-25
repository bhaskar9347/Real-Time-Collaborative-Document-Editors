import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css'; // Ensure this path is correct

const socket = io('http://localhost:5000'); // Connect to backend

const App = () => {
  const [documents, setDocuments] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');

  // Fetch documents from backend
  useEffect(() => {
    axios.get('http://localhost:5000/documents')
      .then(response => setDocuments(response.data))
      .catch(error => console.error('Error fetching documents:', error));
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    socket.on('documentUpdated', (updatedDoc) => {
      setDocuments(prevDocs =>
        prevDocs.map(doc => doc._id === updatedDoc._id ? updatedDoc : doc)
      );
    });

    socket.on('documentDeleted', (deletedDocId) => {
      setDocuments(prevDocs => prevDocs.filter(doc => doc._id !== deletedDocId));
    });

    return () => {
      socket.off('documentUpdated');
      socket.off('documentDeleted');
    };
  }, []);

  // Handle adding a new document
  const handleAddDocument = () => {
    const newDoc = { title: newTitle, content: newContent };
    axios.post('http://localhost:5000/documents', newDoc)
      .then(response => {
        setDocuments([...documents, response.data]);
        setNewTitle('');
        setNewContent('');
      })
      .catch(error => console.error('Error adding document:', error));
  };

  // Handle editing a document
  const handleEditDocument = (doc) => {
    setEditingDocId(doc._id);
    setEditingTitle(doc.title);
    setEditingContent(doc.content);
  };

  const handleSaveEdit = () => {
    const updatedDoc = { title: editingTitle, content: editingContent };
    axios.put(`http://localhost:5000/documents/${editingDocId}`, updatedDoc)
      .then(response => {
        setDocuments(prevDocs =>
          prevDocs.map(doc => doc._id === editingDocId ? response.data : doc)
        );
        socket.emit('documentUpdated', response.data); // Emit update to server
        setEditingDocId(null);
        setEditingTitle('');
        setEditingContent('');
      })
      .catch(error => console.error('Error updating document:', error));
  };

  // Handle deleting a document
  const handleDeleteDocument = (id) => {
    axios.delete(`http://localhost:5000/documents/${id}`)
      .then(() => {
        setDocuments(prevDocs => prevDocs.filter(doc => doc._id !== id));
        socket.emit('documentDeleted', id); // Notify other clients
      })
      .catch(error => console.error('Error deleting document:', error));
  };

  return (
    <div className="App">
      <h1 className="text-3xl font-bold mb-4">📄 Real-Time Collaborative Document Editor</h1>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Add New Document:</h2>
        <input
          type="text"
          placeholder="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Content"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="border p-2 mr-2"
        />
        <button onClick={handleAddDocument} className="bg-blue-500 text-white px-4 py-2 rounded">
          Add Document
        </button>
      </div>
      <h2 className="text-xl font-semibold mb-2">Documents List:</h2>
      {documents.length === 0 ? (
        <p>No documents found.</p>
      ) : (
        <ul className="list-disc ml-6">
          {documents.map(doc => (
            <li key={doc._id} className="mb-4">
              {editingDocId === doc._id ? (
                <div>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="border p-2 mr-2"
                  />
                  <input
                    type="text"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="border p-2 mr-2"
                  />
                  <button onClick={handleSaveEdit} className="bg-green-500 text-white px-4 py-1 rounded mr-2">
                    Save
                  </button>
                  <button onClick={() => setEditingDocId(null)} className="bg-gray-500 text-white px-4 py-1 rounded">
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold">{doc.title}</h3>
                  <p>{doc.content}</p>
                  <button onClick={() => handleEditDocument(doc)} className="bg-yellow-500 text-white px-4 py-1 rounded mt-2 mr-2">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteDocument(doc._id)} className="bg-red-500 text-white px-4 py-1 rounded mt-2">
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default App;