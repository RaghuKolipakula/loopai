document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-btn');
    const eventsGrid = document.getElementById('events-grid');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const topicTitle = document.getElementById('topic-title');

    // Fetch initially
    initPage();

    async function initPage() {
        try {
            const topicRes = await fetch('/api/topic');
            if (topicRes.ok) {
                const data = await topicRes.json();
                if (data.topic) {
                    topicTitle.innerText = data.topic;
                }
            }
        } catch(e) {
            console.error("Failed to fetch topic", e);
        }
        fetchEvents();
    }

    refreshBtn.addEventListener('click', () => {
        // Add a slight rotation animation to the icon
        const icon = refreshBtn.querySelector('.icon');
        icon.style.display = 'inline-block';
        icon.style.transition = 'transform 0.5s ease';
        icon.style.transform = `rotate(${Math.random() > 0.5 ? 360 : -360}deg)`;
        
        setTimeout(() => {
            icon.style.transition = 'none';
            icon.style.transform = 'rotate(0deg)';
        }, 500);

        fetchEvents();
    });

    async function fetchEvents() {
        // Update UI states
        eventsGrid.innerHTML = '';
        errorState.classList.add('hidden');
        loadingState.classList.remove('hidden');
        refreshBtn.disabled = true;
        refreshBtn.style.opacity = '0.7';

        try {
            const response = await fetch('/api/events');
            
            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errorJson = await response.json();
                    errorDetails = errorJson.error || response.statusText;
                } catch(e) {
                    errorDetails = await response.text();
                }
                throw new Error(`Server Error: ${errorDetails}`);
            }
            
            const data = await response.json();
            
            loadingState.classList.add('hidden');
            
            if (data.events && data.events.length > 0) {
                renderEvents(data.events);
            } else {
                throw new Error('No events returned');
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            loadingState.classList.add('hidden');
            
            // Display the exact error message to the user
            const errorMsgEl = errorState.querySelector('.error-msg');
            if (errorMsgEl) {
                errorMsgEl.innerText = "Oops, unable to fetch events right now. " + error.message;
            }
            errorState.classList.remove('hidden');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
        }
    }

    function renderEvents(events) {
        events.forEach((event, index) => {
            // Add a staggered animation delay
            const delay = index * 0.1;
            
            const card = document.createElement('div');
            card.className = 'event-card';
            card.style.animationDelay = `${delay}s`;
            
            // Assign a random gradient based on category or index for visual variety
            const hue = (index * 45) % 360;
            const bgGradient = `linear-gradient(45deg, hsl(${hue}, 60%, 20%), hsl(${hue + 40}, 60%, 30%))`;

            card.innerHTML = `
                <div class="event-image" style="background: ${bgGradient}">
                    <span class="event-category">${event.category || 'Family'}</span>
                </div>
                <div class="event-content">
                    <div class="event-date">${event.date || 'Upcoming'}</div>
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-desc">${event.description}</p>
                    <div class="event-meta">
                        <div class="meta-item">
                            <span class="meta-icon">📍</span>
                            <span>${event.location}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-icon">⭐</span>
                            <span>Organizer: ${event.organizer}</span>
                        </div>
                    </div>
                </div>
            `;
            
            eventsGrid.appendChild(card);
        });
    }
});
