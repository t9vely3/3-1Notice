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

window.CONFIG = { USE_FIREBASE: true };

// 기본 색상 (운영자가 색상 컬렉션을 안 만들었을 때 fallback)
window.DEFAULT_SCHEDULE_COLORS = [
  { id: '_d_green', name: '정상 일정', color: '#10b981', order: 1 },
  { id: '_d_red',   name: '휴강/공강', color: '#dc2626', order: 2 },
  { id: '_d_blue',  name: '월수금 수업', color: '#2563eb', order: 3 },
  { id: '_d_yellow', name: '화목금 수업', color: '#ca8a04', order: 4 }
];

// ============================================================
// API 헬퍼
// ============================================================
window.api = {
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
    if (action === 'getScheduleColors') return await this._getScheduleColors();
    
    // 수업자료
    if (action === 'getMaterialCategories') return await this._getMaterialCategories(data.includeHidden);
    if (action === 'getMaterials')   return await this._getMaterials(data.categoryId, data.includeHidden);
    if (action === 'getMaterial')    return await this._getMaterial(data.id);

    // ===== 쓰기 (인증 필요) =====
    if (auth) {
      const ok = await this.verifyAuth(auth);
      if (!ok) throw new Error('인증 실패');
    }

    if (action === 'savePost')         return await this._save('posts', data);
    if (action === 'deletePost')       return await this._delete('posts', data.id);
    if (action === 'saveSchedule')     return await this._save('schedule', data);
    if (action === 'deleteSchedule')   return await this._delete('schedule', data.id);
    if (action === 'saveScheduleBatch') return await this._saveScheduleBatch(data);
    if (action === 'saveCurriculum')   return await this._save('curriculum', data);
    if (action === 'deleteCurriculum') return await this._delete('curriculum', data.id);
    if (action === 'saveClassroom')    return await this._save('classrooms', data);
    if (action === 'deleteClassroom')  return await this._delete('classrooms', data.id);
    if (action === 'saveRule')         return await this._save('rules', data);
    if (action === 'deleteRule')       return await this._delete('rules', data.id);
    if (action === 'saveSettings')     return await this._saveSettings(data);
    if (action === 'saveScheduleColor')   return await this._save('scheduleColors', data);
    if (action === 'deleteScheduleColor') return await this._delete('scheduleColors', data.id);
    
    if (action === 'saveMaterialCategory')   return await this._save('materialCategories', data);
    if (action === 'deleteMaterialCategory') return await this._deleteMaterialCategory(data.id);
    if (action === 'saveMaterial')           return await this._save('materials', data);
    if (action === 'deleteMaterial')         return await this._delete('materials', data.id);

    throw new Error('Unknown action: ' + action);
  },

  // ===== 내부 헬퍼 =====
  async _getList(collection, orderField = null, orderDir = 'desc') {
    // 인덱스 회피: 단순 조회 후 클라이언트 정렬
    const snap = await db.collection(collection).get();
    let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (orderField) {
      items.sort((a, b) => {
        const av = a[orderField];
        const bv = b[orderField];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return orderDir === 'asc' ? -1 : 1;
        if (av > bv) return orderDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  },

  async _getHome() {
    const todayStr = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 21);
    const futureStr = futureDate.toISOString().split('T')[0];

    // 공지: 전체 가져와서 클라이언트에서 정렬/제한
    const postsSnap = await db.collection('posts').get();
    const posts = postsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);

    // 일정: 전체 가져와서 클라이언트에서 필터/정렬
    const scheduleSnap = await db.collection('schedule').get();
    const schedule = scheduleSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(s => s.date >= todayStr && s.date <= futureStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 4);

    const settings = await this._getSettings();
    return { posts, schedule, settings };
  },

  async _getPosts(category) {
    // 전체 가져와서 클라이언트에서 필터/정렬 (인덱스 회피)
    const snap = await db.collection('posts').get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (category && category !== 'all' && category !== '전체') {
      items = items.filter(p => p.category === category);
    }
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return items;
  },

  async _getPost(id) {
    const doc = await db.collection('posts').doc(id).get();
    if (!doc.exists) throw new Error('Post not found');
    return { id: doc.id, ...doc.data() };
  },

  async _getSchedule() {
    const snap = await db.collection('schedule').get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  },

  async _getSettings() {
    const doc = await db.collection('settings').doc('default').get();
    if (!doc.exists) return {};
    return doc.data();
  },

  async _getScheduleColors() {
    const snap = await db.collection('scheduleColors').get();
    let colors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    colors.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (colors.length === 0) return window.DEFAULT_SCHEDULE_COLORS;
    return colors;
  },

  // 수업자료
  async _getMaterialCategories(includeHidden = false) {
    const snap = await db.collection('materialCategories').get();
    let cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cats.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!includeHidden) cats = cats.filter(c => !c.hidden);
    return cats;
  },

  async _getMaterials(categoryId, includeHidden = false) {
    // where만 사용 (orderBy 분리하면 인덱스 불필요)
    const snap = await db.collection('materials').where('categoryId', '==', categoryId).get();
    let materials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    materials.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!includeHidden) materials = materials.filter(m => !m.hidden);
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

  // 일정 일괄 등록 (반복 패턴)
  async _saveScheduleBatch(data) {
    // data: { dates: [...], colorId, title, description }
    const batch = db.batch();
    const ids = [];
    for (const date of data.dates) {
      const ref = db.collection('schedule').doc();
      batch.set(ref, {
        date,
        colorId: data.colorId,
        title: data.title,
        description: data.description || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      ids.push(ref.id);
    }
    await batch.commit();
    return { count: data.dates.length, ids };
  },

  async _deleteMaterialCategory(id) {
    const childSnap = await db.collection('materialCategories').where('parentId', '==', id).get();
    const allIds = [id, ...childSnap.docs.map(d => d.id)];
    
    for (const catId of allIds) {
      const matSnap = await db.collection('materials').where('categoryId', '==', catId).get();
      for (const mDoc of matSnap.docs) {
        // 이미지도 삭제
        const matData = mDoc.data();
        if (matData.steps) {
          for (const step of matData.steps) {
            if (step.imagePath) {
              await this.deleteImage(step.imagePath).catch(() => {});
            }
          }
        }
        await mDoc.ref.delete();
      }
    }
    
    for (const catId of allIds) {
      await db.collection('materialCategories').doc(catId).delete();
    }
    
    return { deleted: id };
  },

  async _saveSettings(data) {
    await db.collection('settings').doc('default').set(data, { merge: true });
    return data;
  },

  // ===== Storage =====
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

// ============================================================
// 유틸: 요일 패턴으로 날짜 생성
// ============================================================
window.expandDateRange = function(startDate, endDate, weekdays) {
  // weekdays: [0,1,2,3,4,5,6] (일=0, 월=1, ...)
  const result = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  
  const cur = new Date(start);
  while (cur <= end) {
    if (weekdays.includes(cur.getDay())) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      result.push(`${y}-${m}-${d}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
};
