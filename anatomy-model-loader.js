
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
);
gltfLoader.setDRACOLoader(dracoLoader);

// النماذج التي تم تحميلها بالفعل
const loadedLayers = new Map();

// الطلبات الجارية لمنع تكرار تحميل نفس الطبقة
const loadingLayers = new Map();

// تحميل طبقة تشريحية من ملف GLB
export function loadAnatomyLayer({
  id,
  url,
  scene,
  onProgress = () => {}
}) {
  if (!id || !url || !scene) {
    return Promise.reject(
      new Error('id و url و scene بيانات مطلوبة لتحميل النموذج')
    );
  }

  // لو الطبقة محملة بالفعل، أظهرها بدل تحميلها مرة أخرى
  if (loadedLayers.has(id)) {
    const existing = loadedLayers.get(id);
    existing.visible = true;
    return Promise.resolve(existing);
  }

  // لو نفس الطبقة قيد التحميل، أعد نفس الطلب
  if (loadingLayers.has(id)) {
    return loadingLayers.get(id);
  }

  const request = new Promise((resolve, reject) => {
    gltfLoader.load(
      url,

      (gltf) => {
        const model = gltf.scene;
        model.name = id;
        model.userData.anatomyLayer = id;

        model.traverse((object) => {
          if (!object.isMesh) return;

          object.userData.anatomyLayer = id;
          object.castShadow = true;
          object.receiveShadow = true;

          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((material) => {
            if (material) {
              material.side = THREE.DoubleSide;
              material.needsUpdate = true;
            }
          });
        });

        scene.add(model);
        loadedLayers.set(id, model);

        resolve(model);
      },

      (event) => {
        if (event.total > 0) {
          const percent = Math.round(
            (event.loaded / event.total) * 100
          );

          onProgress(percent);
        }
      },

      (error) => {
        reject(error);
      }
    );
  });

  loadingLayers.set(id, request);

  return request.finally(() => {
    loadingLayers.delete(id);
  });
}

// إظهار أو إخفاء طبقة
export function toggleAnatomyLayer(id, visible) {
  const model = loadedLayers.get(id);

  if (!model) return false;

  model.visible = Boolean(visible);
  return true;
}

// إظهار كل الطبقات المحملة
export function showAllAnatomyLayers() {
  loadedLayers.forEach((model) => {
    model.visible = true;
  });
}

// إخفاء كل الطبقات المحملة
export function hideAllAnatomyLayers() {
  loadedLayers.forEach((model) => {
    model.visible = false;
  });
}

// الحصول على طبقة بالاسم
export function getAnatomyLayer(id) {
  return loadedLayers.get(id) || null;
}

// التأكد هل الطبقة محملة
export function isAnatomyLayerLoaded(id) {
  return loadedLayers.has(id);
}

// حذف طبقة وتنظيف مواردها
export function removeAnatomyLayer(id) {
  const model = loadedLayers.get(id);

  if (!model) return false;

  model.traverse((object) => {
    if (!object.isMesh) return;

    object.geometry?.dispose();

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      material?.dispose();
    });
  });

  model.removeFromParent();
  loadedLayers.delete(id);

  return true;
}

// حذف كل الطبقات المحملة
export function removeAllAnatomyLayers() {
  [...loadedLayers.keys()].forEach((id) => {
    removeAnatomyLayer(id);
  });
}

// تنظيف العارض عند إغلاق الصفحة
export function disposeAnatomyViewer() {
  removeAllAnatomyLayers();
  loadingLayers.clear();
  dracoLoader.dispose();
}
