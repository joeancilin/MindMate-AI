(function () {
  var API = ''
  var state = {
    user: null,
    page: 'chat',
    messages: [],
    emotion: null,
    moodLogs: [],
    journals: [],
    themeTip: 'Small steps count. Track the pattern, not perfection.'
  }

  var PROMPTS = [
    'I am anxious before my exam',
    'I feel lonely and ignored',
    'I am angry because this feels unfair',
    'I am exhausted and cannot focus',
    'I feel proud and grateful today'
  ]

  function el(tag, attrs, children) {
    var node = document.createElement(tag)
    attrs = attrs || {}
    Object.keys(attrs).forEach(function (key) {
      if (key === 'class') node.className = attrs[key]
      else if (key === 'style') node.setAttribute('style', attrs[key])
      else if (key.indexOf('on') === 0) node.addEventListener(key.slice(2).toLowerCase(), attrs[key])
      else node.setAttribute(key, attrs[key])
    })
    ;(children || []).forEach(function (child) {
      if (child === null || child === undefined) return
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
    })
    return node
  }

  function api(path, options) {
    options = options || {}
    options.credentials = 'include'
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {})
    return fetch(API + path, options).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {} }).then(function (body) {
          throw new Error(body.detail || body.error || 'Request failed')
        })
      }
      return res.json()
    })
  }

  function styles() {
    if (document.getElementById('fallback-style')) return
    document.head.appendChild(el('style', { id: 'fallback-style' }, [`
      :root{--bg:#0d1117;--panel:#151b26;--panel2:#1b2433;--line:rgba(255,255,255,.09);--text:#f5f7fb;--muted:#9aa8bd;--violet:#a78bfa;--mint:#6ee7b7;--coral:#fca5a5;--gold:#fbbf24}
      *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Segoe UI,Arial,sans-serif}
      .mm-app{min-height:100vh;display:grid;grid-template-columns:260px minmax(0,1fr);background:radial-gradient(circle at 20% 0%,rgba(167,139,250,.16),transparent 34%),radial-gradient(circle at 85% 10%,rgba(110,231,183,.12),transparent 28%),var(--bg)}
      .mm-side{background:rgba(21,27,38,.88);backdrop-filter:blur(14px);border-right:1px solid var(--line);padding:18px;display:flex;flex-direction:column;gap:16px}
      .mm-logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:22px;letter-spacing:.2px}.mm-logo-mark{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--violet),var(--mint));color:#111827;font-weight:900}
      .mm-user{padding:14px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.04)}.mm-user b{display:block}.muted{color:var(--muted)}.tiny{font-size:12px}
      .mm-nav{display:flex;flex-direction:column;gap:8px}.mm-nav button,.mm-btn{border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.045);color:var(--text);cursor:pointer;font-weight:650;transition:.18s ease;padding:12px 13px;text-align:left}
      .mm-nav button:hover,.mm-btn:hover{transform:translateY(-1px);border-color:rgba(167,139,250,.5);background:rgba(167,139,250,.1)}
      .mm-nav button.active{background:rgba(167,139,250,.16);border-color:rgba(167,139,250,.55);color:#ddd6fe}.mm-btn.primary{background:linear-gradient(135deg,var(--violet),#c4b5fd);border:0;color:#101827;text-align:center}.mm-btn.ghost{text-align:center}
      .mm-main{min-width:0;padding:24px;overflow:auto}.mm-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.mm-title h1{margin:0;font-size:30px}.mm-title p{margin:6px 0 0}
      .mm-card{background:rgba(21,27,38,.9);border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.22)}.mm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}.mm-split{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px}
      input,textarea,select{width:100%;box-sizing:border-box;margin:7px 0 12px;padding:13px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.045);color:var(--text);outline:none}textarea{min-height:118px;resize:vertical}label{display:block;color:var(--muted);font-size:13px}
      .msg-list{height:calc(100vh - 330px);min-height:280px;overflow:auto;padding-right:8px}.msg{max-width:760px;margin:10px 0;padding:13px 14px;border-radius:15px;background:rgba(255,255,255,.055);line-height:1.55;border:1px solid rgba(255,255,255,.06)}.msg.user{margin-left:auto;background:rgba(167,139,250,.18);border-color:rgba(167,139,250,.24)}.msg.assistant{border-top-left-radius:4px}
      .chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}.chip{border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text);border-radius:999px;padding:8px 11px;cursor:pointer;font-size:13px}.chip:hover{border-color:var(--mint)}
      .badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:7px 10px;background:rgba(110,231,183,.12);color:#a7f3d0;border:1px solid rgba(110,231,183,.25);font-size:12px;font-weight:750}.badge.warn{background:rgba(252,165,165,.12);color:#fecaca;border-color:rgba(252,165,165,.28)}
      .stat h2{font-size:30px;margin:0}.stat p{margin:5px 0 0;color:var(--muted)}.ok{color:var(--mint)}.err{color:var(--coral)}
      .bar{height:9px;background:rgba(255,255,255,.07);border-radius:999px;overflow:hidden}.bar span{display:block;height:100%;background:linear-gradient(90deg,var(--mint),var(--violet));border-radius:999px}
      .mood-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.mood-tile{padding:14px 8px;text-align:center;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.04);cursor:pointer}.mood-tile.active{border-color:var(--violet);background:rgba(167,139,250,.15)}
      @media(max-width:900px){.mm-app{grid-template-columns:1fr}.mm-side{position:static}.mm-split{grid-template-columns:1fr}.msg-list{height:auto}.mm-top{display:block}}
    `]))
  }

  function renderShell(title, subtitle) {
    styles()
    var root = document.getElementById('root')
    root.innerHTML = ''
    root.appendChild(el('div', { class: 'mm-app' }, [
      el('aside', { class: 'mm-side' }, [
        el('div', { class: 'mm-logo' }, [el('div', { class: 'mm-logo-mark' }, ['M']), el('span', {}, ['MindMate'])]),
        el('div', { class: 'mm-user' }, [
          el('b', {}, [state.user ? state.user.name : 'Guest']),
          el('div', { class: 'muted tiny' }, [state.user ? state.user.email : 'Emotion-aware wellness companion'])
        ]),
        el('nav', { class: 'mm-nav' }, [
          nav('Chat Studio', 'chat', renderChat),
          nav('Mood Tracker', 'mood', renderMood),
          nav('Journal', 'journal', renderJournal),
          nav('Dashboard', 'dashboard', renderDashboard),
          nav('Profile', 'profile', renderProfile),
          nav('Logout', 'logout', logout)
        ]),
        el('div', { class: 'mm-card tiny muted', style: 'margin-top:auto' }, [state.themeTip])
      ]),
      el('main', { class: 'mm-main' }, [
        el('div', { class: 'mm-top' }, [
          el('div', { class: 'mm-title' }, [el('h1', {}, [title]), el('p', { class: 'muted' }, [subtitle || ''])]),
          state.emotion ? emotionBadge(state.emotion) : el('span')
        ]),
        el('div', { id: 'mm-page' })
      ])
    ]))
    return document.getElementById('mm-page')
  }

  function nav(label, page, fn) {
    return el('button', { class: state.page === page ? 'active' : '', onclick: function () { state.page = page; fn() } }, [label])
  }

  function emotionBadge(data) {
    return el('div', { class: 'badge' }, [
      'Detected: ' + data.primary + ' | intensity: ' + data.intensity + ' | confidence: ' + Math.round(data.confidence * 100) + '%'
    ])
  }

  function renderLogin(message) {
    styles()
    var root = document.getElementById('root')
    root.innerHTML = ''
    var signup = false
    function draw() {
      root.innerHTML = ''
      var form = el('form', { class: 'mm-card', style: 'max-width:460px;margin:10vh auto' }, [
        el('div', { class: 'mm-logo', style: 'margin-bottom:18px' }, [el('div', { class: 'mm-logo-mark' }, ['M']), el('span', {}, ['MindMate'])]),
        el('h1', { style: 'margin:0 0 8px' }, [signup ? 'Create your space' : 'Welcome back']),
        el('p', { class: 'muted' }, ['Emotion-aware chat, mood tracking, journaling, and insights.']),
        message ? el('p', { class: 'err' }, [message]) : null,
        signup ? el('input', { name: 'name', placeholder: 'Name', required: 'required' }) : null,
        el('input', { name: 'email', type: 'email', placeholder: 'Email', required: 'required' }),
        signup ? el('input', { name: 'age', type: 'number', min: '13', max: '100', placeholder: 'Age', required: 'required' }) : null,
        el('input', { name: 'password', type: 'password', placeholder: 'Password', required: 'required' }),
        el('button', { class: 'mm-btn primary', type: 'submit', style: 'width:100%;text-align:center' }, [signup ? 'Create account' : 'Sign in']),
        el('button', { class: 'mm-btn ghost', type: 'button', style: 'width:100%;margin-top:8px', onclick: function () { signup = !signup; draw() } }, [signup ? 'Use existing account' : 'Create new account'])
      ])
      form.addEventListener('submit', function (e) {
        e.preventDefault()
        var data = Object.fromEntries(new FormData(form).entries())
        if (signup) {
          data.age = Number(data.age)
          data.confirm_password = data.password
        }
        api(signup ? '/api/auth/signup' : '/api/auth/login', { method: 'POST', body: JSON.stringify(data) })
          .then(function (res) { state.user = res.data; state.page = 'chat'; renderChat() })
          .catch(function (err) { message = err.message; draw() })
      })
      root.appendChild(form)
    }
    draw()
  }

  function loadMe() {
    api('/api/auth/me').then(function (res) {
      state.user = res.data
      renderChat()
    }).catch(function () { renderLogin() })
  }

  function logout() {
    api('/api/auth/logout', { method: 'POST' }).finally(function () {
      state.user = null
      renderLogin()
    })
  }

  function renderChat() {
    var page = renderShell('Chat Studio', 'GoEmotions-style emotion detection with tailored CBT support.')
    var list = el('div', { class: 'msg-list' })
    var input = el('textarea', { placeholder: 'Share what is on your mind...' })
    var send = el('button', { class: 'mm-btn primary', style: 'width:150px;text-align:center' }, ['Send'])

    function drawMessages() {
      list.innerHTML = ''
      if (!state.messages.length) {
        list.appendChild(el('div', { class: 'mm-card muted' }, ['Start with a feeling, situation, or thought. The chat will detect emotion and adapt its response.']))
      }
      state.messages.forEach(function (msg) {
        list.appendChild(el('div', { class: 'msg ' + msg.role }, [msg.content]))
      })
      list.scrollTop = list.scrollHeight
    }

    function submit(text) {
      text = (text || input.value).trim()
      if (!text) return
      input.value = ''
      state.messages.push({ role: 'user', content: text })
      drawMessages()
      send.textContent = 'Thinking...'
      send.disabled = true

      api('/api/chats', { method: 'POST' }).then(function (res) {
        return fetch('/api/chats/' + res.data.id + '/messages', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text })
        })
      }).then(function (res) {
        var reader = res.body.getReader()
        var decoder = new TextDecoder()
        var full = ''
        function read() {
          return reader.read().then(function (chunk) {
            if (chunk.done) {
              state.messages.push({ role: 'assistant', content: full || 'I am here with you.' })
              send.textContent = 'Send'
              send.disabled = false
              renderChat()
              return
            }
            decoder.decode(chunk.value).split('\\n').forEach(function (line) {
              if (!line.startsWith('data: ')) return
              try {
                var data = JSON.parse(line.slice(6))
                if (data.type === 'emotion') state.emotion = data.emotion
                if (data.text) full += data.text
              } catch (e) {}
            })
            return read()
          })
        }
        return read()
      }).catch(function (err) {
        state.messages.push({ role: 'assistant', content: 'Chat error: ' + err.message })
        send.textContent = 'Send'
        send.disabled = false
        drawMessages()
      })
    }

    send.onclick = function () { submit() }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    })

    page.appendChild(el('div', { class: 'mm-split' }, [
      el('section', { class: 'mm-card' }, [
        list,
        el('div', { class: 'chips' }, PROMPTS.map(function (prompt) {
          return el('button', { class: 'chip', onclick: function () { submit(prompt) } }, [prompt])
        })),
        el('div', { style: 'display:flex;gap:10px;align-items:flex-start' }, [input, send])
      ]),
      el('aside', { class: 'mm-card' }, [
        el('h2', { style: 'margin-top:0' }, ['Emotion Model']),
        el('p', { class: 'muted' }, ['Predefined GoEmotions-style taxonomy with intensity, confidence, and support strategy.']),
        state.emotion ? emotionBadge(state.emotion) : el('div', { class: 'badge warn' }, ['No emotion detected yet']),
        el('hr', { style: 'border:0;border-top:1px solid var(--line);margin:18px 0' }),
        el('b', {}, ['Try varied feelings']),
        el('p', { class: 'muted tiny' }, ['Anxiety, anger, sadness, pride, guilt, confusion, gratitude, surprise, and more.'])
      ])
    ]))
    drawMessages()
  }

  function renderMood() {
    var page = renderShell('Mood Tracker', 'Log mood, intensity, and notes for better insights.')
    var selected = 'good'
    var moodKeys = [
      ['great', 'Great'], ['good', 'Good'], ['okay', 'Okay'], ['low', 'Low'], ['struggling', 'Struggling']
    ]
    var tiles = el('div', { class: 'mood-row' })
    var score = el('input', { type: 'range', min: '1', max: '10', value: '7' })
    var note = el('textarea', { placeholder: 'What influenced this mood?' })
    var out = el('div')

    function drawTiles() {
      tiles.innerHTML = ''
      moodKeys.forEach(function (item) {
        tiles.appendChild(el('button', {
          class: 'mood-tile ' + (selected === item[0] ? 'active' : ''),
          onclick: function () { selected = item[0]; drawTiles() }
        }, [item[1]]))
      })
    }

    drawTiles()
    page.appendChild(el('div', { class: 'mm-split' }, [
      el('section', { class: 'mm-card' }, [
        el('label', {}, ['Mood']), tiles,
        el('label', { style: 'margin-top:14px' }, ['Intensity']), score,
        el('label', {}, ['Note']), note,
        el('button', { class: 'mm-btn primary', style: 'width:180px;text-align:center', onclick: function () {
          api('/api/mood', { method: 'POST', body: JSON.stringify({ mood: selected, score: Number(score.value), note: note.value }) })
            .then(function () { out.textContent = 'Mood saved.'; out.className = 'ok'; loadMoodPanel(page) })
            .catch(function (err) { out.textContent = err.message; out.className = 'err' })
        } }, ['Save mood']),
        out
      ]),
      el('aside', { id: 'mood-panel', class: 'mm-card' }, ['Loading mood history...'])
    ]))
    loadMoodPanel(page)
  }

  function loadMoodPanel() {
    var panel = document.getElementById('mood-panel')
    if (!panel) return
    api('/api/mood?range=30').then(function (res) {
      var logs = res.data || []
      panel.innerHTML = ''
      panel.appendChild(el('h2', { style: 'margin-top:0' }, ['Recent Mood']))
      if (!logs.length) {
        panel.appendChild(el('p', { class: 'muted' }, ['No logs yet.']))
        return
      }
      logs.slice(-8).reverse().forEach(function (log) {
        panel.appendChild(el('div', { style: 'margin-bottom:12px' }, [
          el('b', {}, [log.mood + ' - ' + log.score + '/10']),
          el('div', { class: 'bar', style: 'margin-top:6px' }, [el('span', { style: 'width:' + (log.score * 10) + '%' })]),
          el('div', { class: 'muted tiny' }, [log.note || 'No note'])
        ]))
      })
    })
  }

  function renderJournal() {
    var page = renderShell('Journal', 'Write, reflect, and let the emotion model summarize patterns.')
    var text = el('textarea', { placeholder: 'Write at least 50 words for a richer reflection...', style: 'min-height:240px' })
    var out = el('div')
    page.appendChild(el('div', { class: 'mm-split' }, [
      el('section', { class: 'mm-card' }, [
        text,
        el('button', { class: 'mm-btn primary', style: 'width:180px;text-align:center', onclick: function () {
          api('/api/journal', { method: 'POST', body: JSON.stringify({ content: text.value }) })
            .then(function (res) {
              out.textContent = 'Saved. Emotion: ' + (res.data.emotion_detected || 'needs 50+ words')
              out.className = 'ok'
              renderJournal()
            })
            .catch(function (err) { out.textContent = err.message; out.className = 'err' })
        } }, ['Save entry']),
        out
      ]),
      el('aside', { id: 'journal-list', class: 'mm-card' }, ['Loading entries...'])
    ]))
    loadJournalList()
  }

  function loadJournalList() {
    var panel = document.getElementById('journal-list')
    api('/api/journal').then(function (res) {
      panel.innerHTML = ''
      panel.appendChild(el('h2', { style: 'margin-top:0' }, ['Past Entries']))
      ;(res.data || []).forEach(function (entry) {
        panel.appendChild(el('div', { class: 'mm-card', style: 'box-shadow:none;padding:12px' }, [
          el('b', {}, [entry.emotion_detected || 'reflection']),
          el('p', { class: 'muted tiny' }, [entry.preview || '(empty)'])
        ]))
      })
    })
  }

  function renderDashboard() {
    var page = renderShell('Dashboard', 'A clearer wellness snapshot from your activity.')
    api('/api/dashboard/stats').then(function (res) {
      var s = res.data
      page.appendChild(el('div', { class: 'mm-grid' }, [
        stat('Mood streak', s.mood_streak),
        stat('Total chats', s.total_chats),
        stat('Journal entries', s.journal_entries_month),
        stat('Avg mood', s.avg_mood_score + '/10')
      ]))
      page.appendChild(el('div', { class: 'mm-card', style: 'margin-top:16px' }, [
        el('h2', { style: 'margin-top:0' }, ['Weekly Summary']),
        el('p', { class: 'muted' }, [s.weekly_summary || 'No summary yet.'])
      ]))
      page.appendChild(el('div', { class: 'mm-card' }, [
        el('h2', { style: 'margin-top:0' }, ['Emotion Breakdown']),
        el('p', { class: 'muted' }, [Object.keys(s.emotion_distribution || {}).length ? JSON.stringify(s.emotion_distribution) : 'Log moods to build this chart.'])
      ]))
    }).catch(function (err) {
      page.appendChild(el('p', { class: 'err' }, [err.message]))
    })
  }

  function stat(label, value) {
    return el('div', { class: 'mm-card stat' }, [el('h2', {}, [String(value)]), el('p', {}, [label])])
  }

  function renderProfile() {
    var page = renderShell('Profile', 'Personalize tone, reminders, and your MindMate context.')
    var name = el('input', { value: state.user.name || '', placeholder: 'Name' })
    var age = el('input', { type: 'number', value: state.user.age || 18, placeholder: 'Age' })
    var bio = el('textarea', { placeholder: 'Bio' }, [state.user.bio || ''])
    var tone = el('select', {}, [
      el('option', { value: 'supportive' }, ['Supportive and warm']),
      el('option', { value: 'direct' }, ['Direct and practical']),
      el('option', { value: 'reflective' }, ['Reflective and deep'])
    ])
    tone.value = state.user.tone_preference || 'supportive'
    var out = el('div')
    page.appendChild(el('div', { class: 'mm-card', style: 'max-width:720px' }, [
      el('label', {}, ['Name']), name,
      el('label', {}, ['Age']), age,
      el('label', {}, ['Bio']), bio,
      el('label', {}, ['AI tone']), tone,
      el('button', { class: 'mm-btn primary', style: 'width:180px;text-align:center', onclick: function () {
        api('/api/user/profile', { method: 'PUT', body: JSON.stringify({ name: name.value, age: Number(age.value), bio: bio.value, tone_preference: tone.value }) })
          .then(function (res) { state.user = res.data; out.textContent = 'Profile saved.'; out.className = 'ok' })
          .catch(function (err) { out.textContent = err.message; out.className = 'err' })
      } }, ['Save profile']),
      out
    ]))
  }

  setTimeout(function () {
    var root = document.getElementById('root')
    if (!root || root.dataset.reactReady === 'true') return
    styles()
    loadMe()
  }, 1500)
})()
