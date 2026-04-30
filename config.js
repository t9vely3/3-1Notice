// ============================================================
// Firebase 설정
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDvYKTh4G2SFxw8LKgz1YaP3oR1mFbR8Kc",
  authDomain: "notice-3aef1.firebaseapp.com",
  projectId: "notice-3aef1",
  storageBucket: "notice-3aef1.firebasestorage.app",
  messagingSenderId: "39136833631",
  appId: "1:39136833631:web:e85baeeee4dd80f03bebea"
};

// Firebase 초기화 (CDN으로 로드된 SDK 사용)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

window.CONFIG = {
  USE_FIREBASE: true
};

// ============================================================
// API 헬퍼 - Firestore CRUD
// ============================================================
window.api = {
  // 인증 검증
  async verifyAuth(password) {
    try {
      const doc = await db.collection('_admin').doc('password').get();
      if (!doc.exists) throw new Error('관리자 비밀번호가 설정되지 않았습니다');
      return doc.data().value === password;
    } catch (err) {
      console.error('verifyAuth error:', err);
      return false;
    }
  },

  // 통합 호출 (admin.html 호환용)
  async call(action, data = {}, auth = null) {
    // 읽기 액션
    if (action === 'getHome')        return await this._getHome();
    if (action === 'getPosts')       return await this._getPosts(data.category);
    if (action === 'getPost')        return await this._getPost(data.id);
    if (action === 'getSchedule')    return await this._getSchedule();
    if (action === 'getCurriculum')  return await this._getList('curriculum', 'startDate', 'asc');
    if (action === 'getClassrooms')  return await this._getList('classrooms');
    if (action === 'getRules')       return await this._getList('rules', 'order', 'asc');
    if (action === 'getSettings')    return await this._getSettings();

    // 쓰기 액션 - 인증 체크
    if (auth) {
      const ok = await this.verifyAuth(auth);
      if (!ok) throw new Error('인증 실패');
    }

    if (action === 'savePost')       return await this._save('posts', data);
    if (action === 'deletePost')     return await this._delete('posts', data.id);
    if (action === 'saveSchedule')   return await this._save('schedule', data);
    if (action === 'deleteSchedule') return await this._delete('schedule', data.id);
    if (action === 'saveCurriculum') return await this._save('curriculum', data);
    if (action === 'deleteCurriculum') return await this._delete('curriculum', data.id);
    if (action === 'saveClassroom')  return await this._save('classrooms', data);
    if (action === 'deleteClassroom') return await this._delete('classrooms', data.id);
    if (action === 'saveRule')       return await this._save('rules', data);
    if (action === 'deleteRule')     return await this._delete('rules', data.id);
    if (action === 'saveSettings')   return await this._saveSettings(data);

    throw new Error('Unknown action: ' + action);
  },

  // ===== 내부 헬퍼 =====
  async _getList(collection, orderField = null, orderDir = 'desc') {
    let query = db.collection(collection);
    if (orderField) query = query.orderBy(orderField, orderDir);
    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async _getHome() {
    const todayStr = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 21);
    const futureStr = futureDate.toISOString().split('T')[0];

    // 최신 공지 5개
    const postsSnap = await db.collection('posts')
      .orderBy('date', 'desc')
      .limit(5)
      .get();
    const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 다가오는 일정 (오늘부터 3주)
    const scheduleSnap = await db.collection('schedule')
      .where('date', '>=', todayStr)
      .where('date', '<=', futureStr)
      .orderBy('date', 'asc')
      .limit(4)
      .get();
    const schedule = scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const settings = await this._getSettings();

    return { posts, schedule, settings };
  },

  async _getPosts(category) {
    let query = db.collection('posts').orderBy('date', 'desc');
    if (category && category !== 'all' && category !== '전체') {
      query = db.collection('posts').where('category', '==', category).orderBy('date', 'desc');
    }
    const snap = await query.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async _getPost(id) {
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) throw new Error('Post not found');
    return { id: doc.id, ...doc.data() };
  },

  async _getSchedule() {
    const snap = await db.collection('schedule').orderBy('date', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async _getSettings() {
    const doc = await db.collection('settings').doc('default').get();
    if (!doc.exists) return {};
    return doc.data();
  },

  async _save(collection, data) {
    const { id, ...rest } = data;
    if (id) {
      // 업데이트
      await db.collection(collection).doc(id).set(rest, { merge: true });
      return { id, ...rest };
    } else {
      // 추가 (Firestore가 ID 자동 생성)
      const ref = await db.collection(collection).add({
        ...rest,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { id: ref.id, ...rest };
    }
  },

  async _delete(collection, id) {
    await db.collection(collection).doc(id).delete();
    return { deleted: id };
  },

  async _saveSettings(data) {
    await db.collection('settings').doc('default').set(data, { merge: true });
    return data;
  }
};
