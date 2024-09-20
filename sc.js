
        // Earth background setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('earth-background').appendChild(renderer.domElement);

        const geometry = new THREE.SphereGeometry(5, 32, 32);
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/world.jpg');
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const earth = new THREE.Mesh(geometry, material);
        scene.add(earth);

        camera.position.z = 10;

        function animate() {
            requestAnimationFrame(animate);
            earth.rotation.y += 0.001;
            renderer.render(scene, camera);
        }
        animate();
 
        // Trial functionality
        const TRIAL_LIMIT = 15;
        const TRIAL_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

        let trialUsage = JSON.parse(localStorage.getItem('trialUsage')) || {
            count: 0,
            startTime: Date.now()
        };

        function updateTrialInfo() {
            const trialInfoElement = document.getElementById('trial-info');
            const remainingTime = Math.max(0, TRIAL_DURATION - (Date.now() - trialUsage.startTime));
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            trialInfoElement.textContent = `Trial: ${trialUsage.count}/${TRIAL_LIMIT} | Time left: ${minutes}m ${seconds}s`;

            checkAndNotifyTrialStatus();
        }

        function checkTrialStatus() {
            if (Date.now() - trialUsage.startTime > TRIAL_DURATION) {
                trialUsage = {
                    count: 0,
                    startTime: Date.now()
                };
            }
            if (trialUsage.count >= TRIAL_LIMIT) {
                return false;
            }
            return true;
        }

        function incrementTrialUsage() {
            trialUsage.count++;
            localStorage.setItem('trialUsage', JSON.stringify(trialUsage));
            updateTrialInfo();
        }

        // Update trial info every second
        setInterval(updateTrialInfo, 1000);

        // Chatbot functionality
        async function sendMessage() {
            const userInput = document.getElementById('user-input');
            const message = userInput.value.trim();
            if (message === '') return;

            addMessage(message, 'user');
            saveChat(message, 'user');
            userInput.value = '';

            if (!checkTrialStatus()) {
                addMessage("Maaf, batas penggunaan trial Anda telah habis. Silakan tunggu hingga periode trial berikutnya.", 'bot');
                return;
            }

            const loadingMessage = addLoadingMessage();
            const botResponse = await getBotResponse(message);
            removeLoadingMessage(loadingMessage);
            addMessage(botResponse, 'bot');
            saveChat(botResponse, 'bot');

            incrementTrialUsage();
        }

        function addLoadingMessage() {
            const chatContainer = document.getElementById('chat-container');
            const loadingElement = document.createElement('div');
            loadingElement.classList.add('message', 'bot-message');
            loadingElement.innerHTML = '<div class="loading"></div>Jarvis is thinking...';
            chatContainer.appendChild(loadingElement);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return loadingElement;
        }

        function removeLoadingMessage(loadingElement) {
            loadingElement.remove();
        }

        function addMessage(content, sender) {
            const chatContainer = document.getElementById('chat-container');
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', `${sender}-message`);

            if (content.startsWith('data:image') || (content.startsWith('http') && !content.includes('audio-player') && !content.includes('wikipedia-image'))) {
                const img = document.createElement('img');
                img.src = content;
                img.classList.add(sender === 'user' ? 'user-uploaded-image' : 'image-response');
                messageElement.appendChild(img);
            } else {
                messageElement.innerHTML = formatText(content);
            }

            const actionsElement = document.createElement('div');
            actionsElement.classList.add('message-actions');
            
            let actionsHtml = `
                <button class="action-button" onclick="likeMessage(this)"><i class="fas fa-thumbs-up"></i></button>
                <button class="action-button" onclick="dislikeMessage(this)"><i class="fas fa-thumbs-down"></i></button>
                <button class="action-button" onclick="copyMessage(this)"><i class="fas fa-copy"></i></button>
            `;
            
            if (sender === 'bot') {
                actionsHtml += `<button class="action-button" onclick="bacaPesan(this)"><i class="fas fa-volume-up"></i></button>`;
            }
            
            if (content.startsWith('http') && !content.includes('audio-player') && !content.includes('wikipedia-image')) {
                actionsHtml += `<a href="${content}" download class="action-button" target="_blank"><i class="fas fa-download"></i></a>`;
            }
            
            actionsElement.innerHTML = actionsHtml;
            messageElement.appendChild(actionsElement);

            chatContainer.appendChild(messageElement);
             
            chatContainer.scrollTop = chatContainer.scrollHeight;

            // Initialize audio player if present
            const audioPlayer = messageElement.querySelector('.audio-player');
            if (audioPlayer) {
                initAudioPlayer(audioPlayer);
            }
        }

        function formatText(text) {
            // Headings
            text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
            text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');

            // Bold, italic, underline
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
            text = text.replace(/__(.*?)__/g, '<u>$1</u>');

            // Lists
            text = text.replace(/^\s*\d+\.\s(.+)/gm, '<ol><li>$1</li></ol>');
            text = text.replace(/^\s*[\-\*]\s(.+)/gm, '<ul><li>$1</li></ul>');

            // Blockquotes
            text = text.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');

            // Code block
            text = text.replace(/``(\w+)?\n([\s\S]*?)``/g, function(match, lang, code) {
                return `<pre class="code-block"><code>${highlightCode(code, lang)}</code></pre>`;
            });

            // Inline code
            text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Math block
            text = text.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block">$1</div>');

            // Table
            text = text.replace(/\n((?:\|.*)+\|)\n((?:\|:?-+:?)+\|)\n((?:\|.*)+\|)+/g, function(match) {
                const rows = match.trim().split('\n');
                let table = '<table class="markdown-table">';
                
                // Header
                table += '<thead><tr>';
                rows[0].split('|').filter(Boolean).forEach(cell => {
                    table += `<th>${cell.trim()}</th>`;
                });
                table += '</tr></thead>';

                // Body
                table += '<tbody>';
                for (let i = 2; i < rows.length; i++) {
                    table += '<tr>';
                    rows[i].split('|').filter(Boolean).forEach(cell => {
                        table += `<td>${cell.trim()}</td>`;
                    });
                    table += '</tr>';
                }
                table += '</tbody></table>';

                return table;
            });

            // Horizontal rule
            text = text.replace(/^---$/gm, '<hr>');

            // Links
            text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

            // Images
            text = text.replace(/!\[([^\]]+)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" class="inline-image">');

            // Paragraphs
            text = text.replace(/\n\n/g, '</p><p>');
            text = '<p>' + text + '</p>';

            return text;
        }

        function highlightCode(code, lang) {
            // Simple syntax highlighting (you can expand this for more languages and tokens)
            const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return'];
            code = code.replace(/\b(\w+)\b/g, function(match) {
                if (keywords.includes(match)) {
                    return `<span class="keyword">${match}</span>`;
                }
                return match;
            });
            code = code.replace(/(["'])(.*?)\1/g, '<span class="string">$&</span>');
            code = code.replace(/\/\/.*/g, '<span class="comment">$&</span>');
            code = code.replace(/\b(\d+)\b/g, '<span class="number">$&</span>');
            return code;
        }

        function bacaPesan(tombol) {
            const isiPesan = tombol.closest('.message').innerText.split('👍👎📋🔊')[0].trim();
            const ucapan = new SpeechSynthesisUtterance(isiPesan);
            ucapan.lang = 'id-ID'; // Atur bahasa ke Bahasa Indonesia
            window.speechSynthesis.speak(ucapan);
        }

        async function getBotResponse(message) {
            try {
                const specialResponse = handleSpecialCommands(message);
                if (specialResponse) {
                    return specialResponse;
                }

                if (message.toLowerCase().includes('gambar')) {
                    const imageUrl = await getPollinationsImage(message);
                    return imageUrl;
                } else {
                    // Coba gunakan Gemini API terlebih dahulu
                    const geminiResponse = await callGeminiAPI(message);
                    if (geminiResponse) {
                        return geminiResponse; // formatText akan diterapkan di addMessage
                    } else {
                        // Jika Gemini tidak memberikan respons yang memuaskan, gunakan Wikipedia
                        return await getWikipediaInfo(message);
                    }
                }
            } catch (error) {
                console.error('Error in getBotResponse:', error);
                return 'Maaf, terjadi kesalahan saat memproses permintaan Anda.';
            }
        }

        async function callGeminiAPI(message, image = null) {
            const apiKey = 'AIzaSyAQXpryF6jarRauv00zjOboswS0I_yWolE'; // Ganti dengan API key Anda
            const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
            
            let requestBody = {
                contents: [{
                    parts: [{
                        text: message
                    }]
                }]
            };

            if (image) {
                requestBody.contents[0].parts.push({
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: image.split(',')[1] // Mengambil base64 data saja
                    }
                });
            }

            const response = await fetch(`${apiUrl}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }

        async function getWikipediaInfo(query) {
            try {
                const searchUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
                const searchResponse = await fetch(searchUrl);
                const searchData = await searchResponse.json();

                if (searchData.query.search.length > 0) {
                    const pageId = searchData.query.search[0].pageid;
                    const contentUrl = `https://id.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts|pageimages|info&exintro=true&inprop=url&pithumbsize=300&format=json&origin=*`;
                    const contentResponse = await fetch(contentUrl);
                    const contentData = await contentResponse.json();

                    const pageContent = contentData.query.pages[pageId].extract;
                    const pageUrl = contentData.query.pages[pageId].fullurl;
                    const imageUrl = contentData.query.pages[pageId].thumbnail?.source;

                    // Cari file audio
                    const audioUrl = await getWikipediaAudio(pageUrl);

                    let response = `<p>Informasi Wikipedia untuk "${query}":</p>`;
                    
                    if (imageUrl) {
                        response += `<img src="${imageUrl}" alt="${query}" class="wikipedia-image">`;
                    }
                    
                    response += pageContent;

                    if (audioUrl) {
                        response += `<div class="audio-player">
                            <button class="audio-player-btn play-pause"><i class="fas fa-play"></i></button>
                            <div class="audio-player-progress">
                                <div class="audio-player-progress-bar"></div>
                            </div>
                            <span class="audio-player-time">0:00 / 0:00</span>
                            <audio src="${audioUrl}" style="display:none;"></audio>
                        </div>`;
                    }
                    return response;
                } else {
                    return `<p>Maaf, tidak ditemukan informasi Wikipedia untuk "${query}".</p>`;
                }
            } catch (error) {
                console.error('Error fetching Wikipedia info:', error);
                return 'Maaf, terjadi kesalahan saat mencari informasi.';
            }
        }

        async function getWikipediaAudio(pageUrl) {
            try {
                const response = await fetch(pageUrl);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const audioElement = doc.querySelector('audio source[type="audio/mpeg"]');
                if (audioElement) {
                    return audioElement.src;
                }
                return null;
            } catch (error) {
                console.error('Error fetching Wikipedia audio:', error);
                return null;
            }
        }

        async function getPollinationsImage(prompt) {
            return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        }

        function likeMessage(button) {
            button.style.color = '#00a8ff';
        }

        function dislikeMessage(button) {
            button.style.color = '#ff4500';
        }

        function copyMessage(button) {
            const messageContent = button.closest('.message').innerHTML.split('<div class="message-actions">')[0].trim();
            const tempElement = document.createElement('div');
            tempElement.innerHTML = messageContent;
            navigator.clipboard.writeText(tempElement.textContent).then(() => {
                showCopyPopup();
            });
        }

         
        function showCopyPopup() {
            const popup = document.getElementById('copy-popup');
            popup.style.display = 'block';
            setTimeout(() => {
                popup.style.display = 'none';
            }, 2000);
        }

        function clearChat() {
            const chatContainer = document.getElementById('chat-container');
            chatContainer.innerHTML = '';
            localStorage.removeItem('chatHistory');
        }

        function saveChat(message, sender) {
            let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
            chatHistory.push({ message, sender });
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        }

        function loadChat() {
            const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
            chatHistory.forEach(item => {
                addMessage(item.message, item.sender);
            });
        }

        // Load chat history on page load
        loadChat();

        // Handle file input change
        document.getElementById('image-input').addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    addMessage(e.target.result, 'user');
                    saveChat(e.target.result, 'user');
                    getBotResponse(e.target.result).then(response => {
                        addMessage(response, 'bot');
                        saveChat(response, 'bot');
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        // Handle Enter key press in input field
        document.getElementById('user-input').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });

        // Handle more options button
        document.getElementById('more-options').addEventListener('click', function() {
            const optionsMenu = document.getElementById('options-menu');
            optionsMenu.style.display = optionsMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Close options menu when clicking outside
        window.addEventListener('click', function(event) {
            const optionsMenu = document.getElementById('options-menu');
            const moreOptionsButton = document.getElementById('more-options');
            if (!optionsMenu.contains(event.target) && event.target !== moreOptionsButton) {
                optionsMenu.style.display = 'none';
            }
        });

        // Handle sidebar toggle
        document.getElementById('toggle-sidebar').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('active');
        });

        document.getElementById('close-sidebar').addEventListener('click', function() {
            document.getElementById('sidebar').classList.remove('active');
        });

        // Handle notifications
        document.getElementById('enable-notifications').addEventListener('click', function() {
            Notification.requestPermission().then(function(result) {
                if (result === 'granted') {
                    showNotification('Notifikasi Diaktifkan', 'Anda akan menerima pemberitahuan dari Jarvis AI Assistant.');
                }
            });
        });

        function showNotification(title, message) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body: message });
            }
        }

        function handleSpecialCommands(message) {
            const lowerMessage = message.toLowerCase();
            if (lowerMessage === 'clear' || lowerMessage === 'clear chat') {
                clearChat();
                return 'Chat history has been cleared.';
            }
            if (lowerMessage === 'code review') {
                openCodeReviewModal();
                return null;
            }
            return null;
        }

        function openCodeReviewModal() {
            const modal = document.getElementById('code-review-modal');
            modal.style.display = 'block';
        }

        document.querySelector('.close').addEventListener('click', function() {
            document.getElementById('code-review-modal').style.display = 'none';
        });

        document.getElementById('review-button').addEventListener('click', async function() {
            const code = document.getElementById('code-input').value;
            if (code.trim() === '') {
                alert('Please enter some code to review.');
                return;
            }
            const response = await getBotResponse(`Please review the following code:\n\n${code}`);
            addMessage(response, 'bot');
            document.getElementById('code-review-modal').style.display = 'none';
        });

        function initAudioPlayer(playerElement) {
            const audio = playerElement.querySelector('audio');
            const playPauseBtn = playerElement.querySelector('.play-pause');
            const progressBar = playerElement.querySelector('.audio-player-progress-bar');
            const timeDisplay = playerElement.querySelector('.audio-player-time');

            playPauseBtn.addEventListener('click', function() {
                if (audio.paused) {
                    audio.play();
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    audio.pause();
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            });

            audio.addEventListener('timeupdate', function() {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressBar.style.width = `${progress}%`;
                timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
            });

            audio.addEventListener('ended', function() {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                progressBar.style.width = '0%';
            });
        }

        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        }

        function checkAndNotifyTrialStatus() {
            const remainingTime = Math.max(0, TRIAL_DURATION - (Date.now() - trialUsage.startTime));
            const remainingUsage = TRIAL_LIMIT - trialUsage.count;

            if (remainingTime <= 5 * 60 * 1000 && remainingTime > 0) { // 5 minutes left
                showNotification('Trial akan berakhir', `Trial Anda akan berakhir dalam ${Math.ceil(remainingTime / 60000)} menit.`);
            }

            if (remainingUsage <= 10 && remainingUsage > 0) {
                showNotification('Batas penggunaan hampir habis', `Anda memiliki ${remainingUsage} penggunaan tersisa dalam trial ini.`);
            }
        }

        // Initialize the chat interface
        document.addEventListener('DOMContentLoaded', (event) => {
            updateTrialInfo();
        });
