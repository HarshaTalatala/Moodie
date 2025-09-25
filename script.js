// Firebase Firestore functions (available globally from index.html)
let db, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp;

// Initialize Firebase references when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  db = window.firebaseDB;
  collection = window.firebaseCollection;
  addDoc = window.firebaseAddDoc;
  getDocs = window.firebaseGetDocs;
  deleteDoc = window.firebaseDeleteDoc;
  doc = window.firebaseDoc;
  query = window.firebaseQuery;
  orderBy = window.firebaseOrderBy;
  serverTimestamp = window.firebaseServerTimestamp;
});

// Mood selection with visual feedback and accessibility
const moodButtons = document.querySelectorAll('.mood-buttons button');
const moodInput = document.getElementById('mood');

moodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove highlight from all
    moodButtons.forEach(b => b.classList.remove('selected'));
    // Highlight selected
    btn.classList.add('selected');
    moodInput.value = btn.dataset.mood;
    btn.focus();
  });
});

// Handle form submit with Firebase
document.getElementById('moodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mood = moodInput.value;
  const note = document.getElementById('note').value.trim();
  
  if (!mood) {
    showMoodModal();
    return;
  }

  // Show loading state
  const saveBtn = document.querySelector('.save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    // Add entry to Firebase Firestore
    await addDoc(collection(db, 'moodEntries'), {
      mood: mood,
      note: note,
      date: serverTimestamp()
    });

    // Clear form
    document.getElementById('note').value = '';
    moodButtons.forEach(b => b.classList.remove('selected'));
    moodInput.value = '';
    
    // Reload entries
    loadEntries();
  } catch (error) {
    console.error('Error saving entry:', error);
    alert('Failed to save entry. Please try again.');
  } finally {
    // Reset button state
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
});

// Load entries from Firebase
async function loadEntries() {
  try {
    // Show loading state
    const entriesContainer = document.getElementById('entries');
    entriesContainer.innerHTML = '<li><i>Loading entries...</i></li>';

    // Get entries from Firestore, ordered by date (newest first)
    const q = query(collection(db, 'moodEntries'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const entries = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        mood: data.mood,
        note: data.note,
        date: data.date?.toDate() || new Date() // Convert Firebase Timestamp to Date
      });
    });

    // Display entries with delete buttons
    entriesContainer.innerHTML = entries.length
      ? entries.map(e => `
        <li data-id="${e.id}">
          <div class="entry-content">
            <b>${e.mood}</b> - ${e.note ? e.note : '<i>No note</i>'}
            <small>${e.date.toLocaleString()}</small>
          </div>
          <button class="delete-btn" onclick="deleteEntry('${e.id}')" aria-label="Delete entry">🗑️</button>
        </li>
      `).join('')
      : '<li><i>No entries yet. Start journaling!</i></li>';
      
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entryId = btn.parentElement.dataset.id;
        deleteEntry(entryId);
      });
    });
      
  } catch (error) {
    console.error('Error loading entries:', error);
    document.getElementById('entries').innerHTML = '<li><i>Error loading entries. Please refresh the page.</i></li>';
  }
}

// Modal functionality
let currentDeleteId = null;

function showDeleteModal(entryId) {
  currentDeleteId = entryId;
  const modal = document.getElementById('deleteModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

function hideDeleteModal() {
  const modal = document.getElementById('deleteModal');
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
    currentDeleteId = null;
  }, 300);
}

// Delete entry function
async function deleteEntry(entryId) {
  showDeleteModal(entryId);
}

// Actual delete function
async function confirmDeleteEntry() {
  if (!currentDeleteId) return;

  try {
    // Delete from Firebase Firestore
    await deleteDoc(doc(db, 'moodEntries', currentDeleteId));
    
    // Hide modal and reload entries
    hideDeleteModal();
    loadEntries();
  } catch (error) {
    console.error('Error deleting entry:', error);
    alert('Failed to delete entry. Please try again.');
    hideDeleteModal();
  }
}

// Make delete function globally available
window.deleteEntry = deleteEntry;

// Mood Selection Modal Functions
function showMoodModal() {
  const modal = document.getElementById('moodModal');
  modal.style.display = 'flex';
  
  // Trigger animation after display is set
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  
  // Focus the OK button for accessibility
  setTimeout(() => {
    document.getElementById('okMood').focus();
  }, 300);
}

function hideMoodModal() {
  const modal = document.getElementById('moodModal');
  modal.classList.remove('show');
  
  // Hide modal after animation
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Delete modal elements
  const deleteModal = document.getElementById('deleteModal');
  const cancelBtn = document.getElementById('cancelDelete');
  const confirmBtn = document.getElementById('confirmDelete');

  // Cancel button
  cancelBtn.addEventListener('click', hideDeleteModal);
  
  // Confirm button
  confirmBtn.addEventListener('click', confirmDeleteEntry);
  
  // Click outside to close delete modal
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      hideDeleteModal();
    }
  });

  // Mood modal elements
  const moodModal = document.getElementById('moodModal');
  const okBtn = document.getElementById('okMood');

  // OK button for mood modal
  okBtn.addEventListener('click', hideMoodModal);

  // Click outside to close mood modal
  moodModal.addEventListener('click', (e) => {
    if (e.target === moodModal) {
      hideMoodModal();
    }
  });
  
  // Escape key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (currentDeleteId) {
        hideDeleteModal();
      }
      if (moodModal.classList.contains('show')) {
        hideMoodModal();
      }
    }
  });
});

// Wait for Firebase to be initialized before loading entries
setTimeout(loadEntries, 100);
