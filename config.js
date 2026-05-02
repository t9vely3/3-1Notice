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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

window.CONFIG = {
  USE_FIREBASE: true
};

// ============================================================
// API 헬퍼
// ============================================================
window.api = {
  // 인증
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

  async call(action, data = {}, auth = null) {
    // ===== 읽기 =====
    if (action === 'getHome')        return await this._getHome();
    if (action === 'getPosts')       return await this._getPosts(data.category);
    if (action === 'getPost')        return await this._getPost(data.id);
    if (action === 'getSchedule')    return await this._getSchedule();
    if (action === 'getCurriculum')  return await this._getList('curriculum', 'startDate', 'asc');
    if (action === 'getClassrooms')  return await this._getList('classrooms');
    if (action === 'getRules')       return await this._getList('rules', 'order', 'asc');
    if (action === 'getSettings')    return await this._getSettings();
    
    // 수업자료
    if (action === 'getMaterialCategories') return await this._getMaterialCategories(data.includeHidden);
    if (action === 'getMaterials')   return await this._getMaterials(data.categoryId, data.includeHidden);
    if (action === 'getMaterial')    return await this._getMaterial(data.id);

    // ===== 쓰기 (인증 필요) =====
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
    
    // 수업자료
    if (action === 'saveMaterialCategory') return await this._save('materialCategories', data);
    if (action === 'deleteMaterialCategory') return await this._deleteMaterialCategory(data.id);
    if (action === 'saveMaterial')   return await this._save('materials', data);
    if (action === 'deleteMaterial') return await this._delete('materials', data.id);

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

    const postsSnap = await db.collection('posts').orderBy('date', 'desc').limit(5).get();
    const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
    let query;
    if (category && category !== 'all' && category !== '전체') {
      query = db.collection('posts').where('category', '==', category).orderBy('date', 'desc');
    } else {
      query = db.collection('posts').orderBy('date', 'desc');
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

  // 수업자료 - 카테고리
  async _getMaterialCategories(includeHidden = false) {
    const snap = await db.collection('materialCategories').orderBy('order', 'asc').get();
    let cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!includeHidden) {
      cats = cats.filter(c => !c.hidden);
    }
    return cats;
  },

  // 수업자료 - 콘텐츠
  async _getMaterials(categoryId, includeHidden = false) {
    let query = db.collection('materials').where('categoryId', '==', categoryId).orderBy('order', 'asc');
    const snap = await query.get();
    let materials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!includeHidden) {
      materials = materials.filter(m => !m.hidden);
    }
    return materials;
  },

  async _getMaterial(id) {
    const doc = await db.collection('materials').doc(id).get();
    if (!doc.exists) throw new Error('Material not found');
    return { id: doc.id, ...doc.data() };
  },

  async _save(collection, data) {
    const { id, ...rest } = data;
    if (id) {
      await db.collection(collection).doc(id).set(rest, { merge: true });
      return { id, ...rest };
    } else {
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

  // 카테고리 삭제 시 - 하위 카테고리 + 소속 콘텐츠도 삭제
  async _deleteMaterialCategory(id) {
    // 하위 카테고리 찾기
    const childSnap = await db.collection('materialCategories').where('parentId', '==', id).get();
    
    // 하위 카테고리 ID 수집 (자기 자신 포함)
    const allIds = [id, ...childSnap.docs.map(d => d.id)];
    
    // 모든 카테고리에 속한 콘텐츠 삭제
    for (const catId of allIds) {
      const matSnap = await db.collection('materials').where('categoryId', '==', catId).get();
      for (const mDoc of matSnap.docs) {
        await mDoc.ref.delete();
      }
    }
    
    // 카테고리들 삭제
    for (const catId of allIds) {
      await db.collection('materialCategories').doc(catId).delete();
    }
    
    return { deleted: id };
  },

  async _saveSettings(data) {
    await db.collection('settings').doc('default').set(data, { merge: true });
    return data;
  },

  // ===== Storage (이미지 업로드) =====
  async uploadImage(file, path = 'materials') {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fullPath = `${path}/${timestamp}_${safeName}`;
    const ref = storage.ref(fullPath);
    const snap = await ref.put(file);
    const url = await snap.ref.getDownloadURL();
    return { url, path: fullPath };
  },

  async deleteImage(path) {
    if (!path) return;
    try {
      const ref = storage.ref(path);
      await ref.delete();
    } catch (e) {
      console.warn('이미지 삭제 실패:', e);
    }
  }
};
