import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
  import { getFirestore, collection, addDoc, doc, getDocs, getDoc, deleteDoc, updateDoc, query, where, limit, orderBy, startAfter, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyD4e8QdrgT4p0Qlq4yKmMz8iUtd6ZqGFgg",
    authDomain: "growwork-8e32e.firebaseapp.com",
    projectId: "growwork-8e32e",
    storageBucket: "growwork-8e32e.appspot.com",
    messagingSenderId: "74310023008",
    appId: "1:74310023008:web:91f90c971fd8ba0a851005"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const adminEmail = "deepak.loomsberries@gmail.com";

  function getCollectionPath(collectionName) {
      if (collectionName === 'locations') {
          return `artifacts/${firebaseConfig.projectId}/public/data/${collectionName}`;
      }
      return `artifacts/${firebaseConfig.appId}/public/data/${collectionName}`;
  }
  
  const PAGE_SIZE = 10;
  let paginationState = {};
  let currentSection = '';
  let searchDebounceTimeout;

  const passwordGate = document.getElementById("passwordGate");
  const adminPanel = document.getElementById("adminPanel");
  
  onAuthStateChanged(auth, (user) => {
    if (user && user.email === adminEmail) {
      passwordGate.classList.remove('active');
      adminPanel.classList.remove("hidden");
      initializeAdminPanel();
    } else {
      window.location.href = "login-signup-page.html";
    }
  });

  function initializeAdminPanel() {
      setupEventListeners();
      showSection('categories');
  }
  
  function setupEventListeners() {
      document.getElementById('main-nav').addEventListener('click', (e) => {
          if (e.target.tagName === 'A') showSection(e.target.dataset.section);
      });
      document.getElementById('logoutButton').addEventListener('click', async () => {
          if(confirm("Want to log out?")) await signOut(auth);
      });
      document.getElementById('addLocationBtn').addEventListener('click', addLocation);
      
      document.getElementById('showCreateCategoryModal').addEventListener('click', () => openCreateModal('Business'));
      document.getElementById('showCreateServiceModal').addEventListener('click', () => openCreateModal('Service'));

      document.getElementById('searchCategories').addEventListener('input', (e) => debounceSearch(e.target.value));
      document.getElementById('searchServices').addEventListener('input', (e) => debounceSearch(e.target.value));
      document.getElementById('searchLocations').addEventListener('input', (e) => debounceSearch(e.target.value));

      document.getElementById('pageContent').addEventListener('click', handleCardButtonClick);
      document.getElementById('itemForm').addEventListener('submit', saveItemForm);
      document.getElementById('cancelModalBtn').addEventListener('click', closeItemModal);
      
      document.getElementById('uploadCsvBtn').addEventListener('click', handleGroupedCsvUpload);
  }

  function debounceSearch(searchTerm) {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
          loadDataForCurrentSection(true, searchTerm.toLowerCase().trim());
      }, 300);
  }
  
  function showSection(sectionId) {
      currentSection = sectionId;
      document.querySelectorAll('.main-content .section').forEach(s => s.classList.add('hidden'));
      document.getElementById(sectionId).classList.remove('hidden');
      document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
      const activeLink = document.querySelector(`#main-nav a[data-section="${sectionId}"]`);
      activeLink.classList.add('active');
      document.getElementById('current-section-title').textContent = activeLink.textContent;
      
      const searchInputId = `search${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`;
      const searchInput = document.getElementById(searchInputId);
      loadDataForCurrentSection(true, searchInput ? searchInput.value.trim() : '');
  }
  
  const sectionConfig = {
      'categories': { collection: 'services', list: 'categoriesList', renderer: 'renderServiceCard', options: { filter: where("type", "==", "Business"), orderBy: "name" } },
      'services':   { collection: 'services', list: 'servicesList', renderer: 'renderServiceCard', options: { filter: where("type", "==", "Service"), orderBy: "name" } },
      'locations':  { collection: 'locations', list: 'locationsTableBody', renderer: 'renderLocationRow', options: { orderBy: "state" } },
  };

  function loadDataForCurrentSection(reset = false, searchTerm = '') {
      if (reset) {
          paginationState[currentSection] = { last: null, searchTerm: searchTerm };
      }
      const config = sectionConfig[currentSection];
      if (config) {
          loadCollection(config.collection, config.list, config.renderer, config.options, searchTerm);
      }
  }

  async function loadCollection(collectionName, listElId, rendererName, options, searchTerm, direction = null) {
      const listEl = document.getElementById(listElId);
      
      if (listEl.tagName === 'TBODY') {
          listEl.innerHTML = `<tr><td colspan="4" class="empty-state-row"><div class="empty-state">Loading new data...</div></td></tr>`;
      } else {
          listEl.innerHTML = `<p>Loading new data...</p>`;
      }
      
      const state = paginationState[currentSection] || {};
      
      let constraints = [];
      if(options.filter) constraints.push(options.filter);

      if (searchTerm) {
          constraints.push(where("searchableKeywords", "array-contains", searchTerm.toLowerCase()));
      }

      if(options.orderBy) constraints.push(orderBy(options.orderBy));
      if (direction === 'next' && state.last) constraints.push(startAfter(state.last));
      constraints.push(limit(PAGE_SIZE));
      
      const collPath = getCollectionPath(collectionName);
      const q = query(collection(db, collPath), ...constraints);

      try {
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs;
        
        if (docs.length > 0) {
            listEl.innerHTML = docs.map(doc => window[rendererName](doc.id, doc.data())).join('');
        } else {
            const emptyMessage = searchTerm 
                ? `No items found for "<strong>${searchTerm}</strong>".` 
                : "No items found. Create one to get started!";
            
            if (listEl.tagName === 'TBODY') {
                listEl.innerHTML = `<tr><td colspan="4" class="empty-state-row"><div class="empty-state">${emptyMessage}</div></td></tr>`;
            } else {
                 listEl.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
            }
        }
        
        state.last = docs.length > 0 ? docs[docs.length - 1] : null;
        state.hasNext = docs.length === PAGE_SIZE;
        paginationState[currentSection] = state;

        const paginationElId = currentSection === 'locations' ? 'locationsPagination' : `${listElId.replace('List', '')}Pagination`;
        renderPaginationControls(collectionName, listElId, rendererName, options, searchTerm, paginationElId);

      } catch (error) {
        console.error("Firestore Query Error:", error);
        const errorMessage = `<div class="empty-state" style="color:red;"><strong>Error: Could not load data.</strong><br>This usually means a Firestore index is required. Check the browser console for a link to create it.</div>`;
         if (listEl.tagName === 'TBODY') {
             listEl.innerHTML = `<tr><td colspan="4" class="empty-state-row">${errorMessage}</td></tr>`;
         } else {
            listEl.innerHTML = errorMessage;
         }
      }
  }

  function renderPaginationControls(collectionName, listElId, rendererName, options, searchTerm, paginationElId) {
      const paginationEl = document.getElementById(paginationElId);
      const state = paginationState[currentSection] || {};
      const optionsBase64 = btoa(JSON.stringify(options));
      const escapedSearchTerm = searchTerm.replace(/'/g, "\\'");
      paginationEl.innerHTML = `<button onclick="window.loadCollectionWrapper('${collectionName}', '${listElId}', '${rendererName}', '${optionsBase64}', '${escapedSearchTerm}', 'next')" ${!state.hasNext ? 'disabled' : ''}>Next Page</button>`;
  }
  
  window.loadCollectionWrapper = (collectionName, listElId, rendererName, optionsBase64, searchTerm, direction) => {
    const options = JSON.parse(atob(optionsBase64));
    loadCollection(collectionName, listElId, rendererName, options, searchTerm, direction);
  }
  
  window.renderServiceCard = (id, data) => {
    const keywordsText = (data.keywords && data.keywords.length > 0) ? data.keywords.join(', ') : 'N/A';
    return `
    <div class="card" data-id="${id}">
        <div>
            <h4>${data.name}</h4>
            <p><strong>Type:</strong> ${data.type}</p>
            <p><strong>Tag:</strong> ${data.tag || 'N/A'}</p>
            <p class="keywords"><strong>Keywords:</strong> ${keywordsText}</p>
        </div>
        <div class="actions">
          <button class="edit-btn btn-secondary" data-collection="services" data-id="${id}">Edit</button>
          <button class="delete-btn btn-danger" data-collection="services" data-id="${id}">Delete</button>
        </div>
    </div>`;
  }
  
  window.renderLocationRow = (id, data) => {
    const areasHtml = (data.areas && data.areas.length > 0) 
        ? `<ul class="areas-list">${data.areas.map(area => `<li>${area}</li>`).join('')}</ul>` 
        : 'No areas listed';

    return `
    <tr data-id="${id}">
        <td>${data.state}</td>
        <td>${data.city}</td>
        <td>${areasHtml}</td>
        <td class="actions">
          <button class="edit-btn btn-secondary" data-collection="locations" data-id="${id}">Edit</button>
          <button class="delete-btn btn-danger" data-collection="locations" data-id="${id}">Delete</button>
        </td>
    </tr>`;
  };
  
  async function handleCardButtonClick(e) {
    const target = e.target.closest('.edit-btn, .delete-btn');
    if (!target) return;

    const collectionName = target.dataset.collection;
    const id = target.dataset.id;
    if (!collectionName || !id) return;

    const collPath = getCollectionPath(collectionName);
    const docRef = doc(db, collPath, id);

    if (target.matches('.edit-btn')) {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) openEditModal(collectionName, id, docSnap.data());
    }
    
    if (target.matches('.delete-btn')) {
      const itemName = collectionName === 'locations' 
          ? `this city entry? All associated areas will be deleted.`
          : `this item permanently? This action cannot be undone.`;
      if (confirm(`Are you sure you want to delete ${itemName}`)) {
        try {
            await deleteDoc(docRef);
            loadDataForCurrentSection(true);
        } catch(err) {
            console.error("Deletion error:", err);
            alert("Could not delete item. See console for details.");
        }
      }
    }
  }

  async function addLocation() {
      const state = document.getElementById("newState").value.trim();
      const city = document.getElementById("newCity").value.trim();
      const newArea = document.getElementById("newArea").value.trim();
      if (!state || !city || !newArea) return alert("All location fields are required.");

      const collPath = getCollectionPath('locations');
      const q = query(collection(db, collPath), where("state", "==", state), where("city", "==", city));
      
      try {
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
              const data = {
                  state, city, areas: [newArea], createdAt: Timestamp.now()
              };
              data.searchableKeywords = generateSearchableKeywords(data, 'locations');
              await addDoc(collection(db, collPath), data);
          } else {
              const docRef = snapshot.docs[0].ref;
              const docData = snapshot.docs[0].data();
              const existingAreas = docData.areas || [];

              if (!existingAreas.includes(newArea)) {
                  const updatedAreas = [...existingAreas, newArea];
                  const updatedData = { ...docData, areas: updatedAreas };
                  const updatedKeywords = generateSearchableKeywords(updatedData, 'locations');
                  await updateDoc(docRef, { areas: updatedAreas, searchableKeywords: updatedKeywords });
              } else {
                  alert(`Area "${newArea}" already exists for ${city}, ${state}.`);
              }
          }
          document.getElementById("newState").value = "";
          document.getElementById("newCity").value = "";
          document.getElementById("newArea").value = "";
          loadDataForCurrentSection(true);
      } catch (err) {
          console.error("Error adding/updating location:", err);
          alert("Error processing location. See console for details.");
      }
  }

  function openCreateModal(type) {
      document.getElementById('modalTitle').textContent = `Create New ${type === 'Business' ? 'Category' : 'Service'}`;
      document.getElementById('itemForm').reset();
      document.getElementById('docId').value = ''; 
      document.getElementById('collectionName').value = 'services';
      document.getElementById('itemType').value = type;

      const formFields = document.getElementById('formFields');
      formFields.innerHTML = `
          <label for="fieldName">Name</label>
          <input type="text" id="fieldName" name="name" required>
          <label for="fieldTag">Tag</label>
          <input type="text" id="fieldTag" name="tag">
          <label for="fieldKeywords">Keywords (comma-separated)</label>
          <input type="text" id="fieldKeywords" name="keywords" placeholder="e.g. food, delivery, restaurant">
      `;
      document.getElementById('itemModal').classList.add('active');
  }
  
  function openEditModal(collectionName, id, data) {
    document.getElementById('modalTitle').textContent = `Edit Item`;
    document.getElementById('itemForm').reset();
    document.getElementById('docId').value = id;
    document.getElementById('collectionName').value = collectionName;
    const formFields = document.getElementById('formFields');
    formFields.innerHTML = ''; 

    let fieldsHtml = '';
    if (collectionName === 'services') {
      const keywordsString = (data.keywords || []).join(', ');
      fieldsHtml = `
          <label for="edit_name">Name</label>
          <input type="text" id="edit_name" name="name" value="${data.name || ''}" required>
          <label for="edit_tag">Tag</label>
          <input type="text" id="edit_tag" name="tag" value="${data.tag || ''}">
          <label for="edit_keywords">Keywords (comma-separated)</label>
          <input type="text" id="edit_keywords" name="keywords" value="${keywordsString}">
      `;
    } else if (collectionName === 'locations') {
       const areasString = (data.areas || []).join(', ');
       fieldsHtml = `
          <label for="edit_state">State</label>
          <input type="text" id="edit_state" name="state" value="${data.state || ''}" required>
          <label for="edit_city">City</label>
          <input type="text" id="edit_city" name="city" value="${data.city || ''}" required>
          <label for="edit_areas">Areas (comma-separated)</label>
          <textarea id="edit_areas" name="areas" rows="6" required>${areasString}</textarea>
          <small>To delete an area, simply remove it from this list and save.</small>
      `;
    }
    formFields.innerHTML = fieldsHtml;
    document.getElementById('itemModal').classList.add('active');
  }

  function closeItemModal() {
    document.getElementById('itemModal').classList.remove('active');
  }

  function generateSearchableKeywords(data, collectionName) {
      const keywords = new Set();
      const addWords = (str) => {
          if (!str) return;
          str.toLowerCase().split(/[\s,.-]+/).filter(Boolean).forEach(word => keywords.add(word));
      };
      
      if(collectionName === 'services'){
        addWords(data.name);
        addWords(data.tag);
        addWords(data.type);
        if(Array.isArray(data.keywords)) {
            data.keywords.forEach(kw => addWords(kw));
        } else if (typeof data.keywords === 'string'){
            addWords(data.keywords);
        }
      } else if (collectionName === 'locations') {
        addWords(data.state);
        addWords(data.city);
        if(Array.isArray(data.areas)) {
            data.areas.forEach(area => addWords(area));
        }
      }
      return Array.from(keywords);
  }

  async function saveItemForm(event) {
      event.preventDefault();
      const form = event.target;
      const id = form.docId.value;
      const collectionName = form.collectionName.value;
      
      const formData = new FormData(form);
      let newData = Object.fromEntries(formData.entries());
      delete newData.docId; 
      delete newData.collectionName;

      if (collectionName === 'locations' && typeof newData.areas === 'string') {
          newData.areas = newData.areas.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (collectionName === 'services' && typeof newData.keywords === 'string') {
          newData.keywords = newData.keywords.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      const collPath = getCollectionPath(collectionName);
      
      try {
        if (id) { 
            const originalDocRef = doc(db, collPath, id);
            const originalDocSnap = await getDoc(originalDocRef);
            if (originalDocSnap.exists()) {
               const originalData = originalDocSnap.data();
               if (originalData.type !== undefined) {
        newData.type = originalData.type;
    } 
               newData.createdAt = originalData.createdAt || Timestamp.now();
            }
            newData.searchableKeywords = generateSearchableKeywords(newData, collectionName);
            // Remove undefined fields
        Object.keys(newData).forEach(key => {
            if (newData[key] === undefined) delete newData[key];
        });
        await updateDoc(originalDocRef, newData);
        } else {
            newData.type = form.itemType.value;
            newData.createdAt = Timestamp.now();
            newData.searchableKeywords = generateSearchableKeywords(newData, collectionName);
            // Remove undefined fields
        Object.keys(newData).forEach(key => {
            if (newData[key] === undefined) delete newData[key];
        });
        await addDoc(collection(db, collPath), newData);
        }
        closeItemModal();
        const searchInput = document.getElementById(`search${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}`);
        const currentSearchTerm = searchInput ? searchInput.value.trim() : '';
        loadDataForCurrentSection(true, currentSearchTerm);
      } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item: ' + error.message);
      }
  }
  
  async function handleGroupedCsvUpload() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];
    const warning = document.getElementById('uploadWarning');
    const progressBar = document.getElementById('uploadProgressBar');
    if (!file) return alert("Please select a CSV file.");

    warning.textContent = "Processing... Please do not refresh the page.";
    progressBar.style.display = "block";
    progressBar.value = 0;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const total = rows.length;
        if(total === 0) {
            warning.textContent = "";
            progressBar.style.display = "none";
            return alert("CSV file is empty.");
        }
        let processed = 0;

        for (const row of rows) {
            const parts = row.split(',').map(p => p.trim());
            if (parts.length < 4) {
                 console.warn("Skipping malformed row:", row);
                 processed++;
                 progressBar.value = Math.round((processed / total) * 100);
                 continue;
            }
            const [state, city, newArea, action] = parts;

            if (!['ADD', 'DELETE'].includes(action.toUpperCase())) {
                console.warn(`Skipping row with invalid action "${action}":`, row);
                processed++;
                 progressBar.value = Math.round((processed / total) * 100);
                continue;
            }

            const collPath = getCollectionPath('locations');
            const q = query(collection(db, collPath), where("state", "==", state), where("city", "==", city));

            try {
                const snapshot = await getDocs(q);
                if (snapshot.empty && action.toUpperCase() === 'ADD') {
                    const data = { state, city, areas: [newArea], createdAt: Timestamp.now() };
                    data.searchableKeywords = generateSearchableKeywords(data, 'locations');
                    await addDoc(collection(db, collPath), data);
                } else if (!snapshot.empty) {
                    const docRef = snapshot.docs[0].ref;
                    const docData = snapshot.docs[0].data();
                    let currentAreas = docData.areas || [];

                    if (action.toUpperCase() === 'ADD' && !currentAreas.includes(newArea)) {
                        currentAreas.push(newArea);
                    } else if (action.toUpperCase() === 'DELETE' && currentAreas.includes(newArea)) {
                        currentAreas = currentAreas.filter(a => a !== newArea);
                    }
                    
                    if (currentAreas.length > 0) {
                        const updatedData = { ...docData, areas: currentAreas };
                        const searchableKeywords = generateSearchableKeywords(updatedData, 'locations');
                        await updateDoc(docRef, { areas: currentAreas, searchableKeywords });
                    } else {
                        await deleteDoc(docRef);
                    }
                }
            } catch (err) {
                console.error("Error processing row:", row, err);
            }
            processed++;
            progressBar.value = Math.round((processed / total) * 100);
        }

        alert("CSV processing complete.");
        warning.textContent = "";
        progressBar.style.display = "none";
        loadDataForCurrentSection(true); 
    };
    reader.readAsText(file);
  }