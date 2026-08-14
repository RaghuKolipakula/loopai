document.addEventListener('DOMContentLoaded', () => {
    const adminForm = document.getElementById('admin-form');
    const topicInput = document.getElementById('topic');
    const passwordInput = document.getElementById('password');
    const saveBtn = document.getElementById('save-btn');
    const statusMessage = document.getElementById('status-message');

    // Fetch current topic on load
    fetch('/api/topic')
        .then(res => res.json())
        .then(data => {
            if (data.topic) {
                topicInput.value = data.topic;
            }
        })
        .catch(console.error);

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newTopic = topicInput.value.trim();
        const password = passwordInput.value.trim();

        if (!newTopic || !password) return;

        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';
        statusMessage.className = 'status-msg';
        statusMessage.innerText = '';

        try {
            const response = await fetch('/api/topic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic: newTopic,
                    password: password
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned ${response.status}`);
            }

            statusMessage.innerText = 'Topic updated successfully! The homepage will now show events for this topic.';
            statusMessage.className = 'status-msg status-success';
            passwordInput.value = ''; // clear password
            
        } catch (error) {
            statusMessage.innerText = 'Error: ' + error.message;
            statusMessage.className = 'status-msg status-error';
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save New Topic';
        }
    });
});
