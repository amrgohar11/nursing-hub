
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  loadAnatomyLayer,
  toggleAnatomyLayer,
  getAnatomyLayer,
  removeAnatomyLayer,
  removeAllAnatomyLayers
} from './anatomy-model-loader.js';

/* =========================================
   NURSING HUB - ANATOMY EXPLORER
   ========================================= */

const $ = (id) => document.getElementById(id);

const stage = $('anatomy-stage');
const loadingElement = $('stage-loading');

if (!stage) {
  throw new Error('anatomy-stage element was not found.');
}

/* =========================================
   ANATOMY DATA
   ========================================= */

const anatomySystems = {

  circulatory: {
    name: 'الجهاز الدوري',
    english: 'Circulatory System',
    icon: '❤️',
    organs: [
      {
        id: 'heart',
        name: 'القلب',
        english: 'Heart',
        icon: '❤️',
        model: 'models/anatomy/heart.glb',
        structure: 'يتكون القلب من أربع حجرات: أذين أيمن وأذين أيسر وبطين أيمن وبطين أيسر. تفصل بينها صمامات تنظم تدفق الدم.',
        function: 'ضخ الدم إلى الرئتين للحصول على الأكسجين ثم إلى جميع أجزاء الجسم.',
        assessment: 'قياس النبض ومعدل ضربات القلب وضغط الدم، وملاحظة أصوات القلب وأي علامات لضعف التروية.',
        notes: 'القلب عضو عضلي أجوف يقع داخل التجويف الصدري بين الرئتين.',
        alert: 'ألم الصدر المفاجئ وضيق التنفس والتعرق الشديد تستدعي تقييمًا طبيًا عاجلًا.'
      },
      {
        id: 'blood-vessels',
        name: 'الأوعية الدموية',
        english: 'Blood Vessels',
        icon: '🩸',
        model: 'models/anatomy/blood-vessels.glb',
        structure: 'تشمل الشرايين والأوردة والشعيرات الدموية.',
        function: 'نقل الدم والأكسجين والمواد الغذائية إلى الأنسجة وإعادة الدم إلى القلب.',
        assessment: 'تقييم النبض الطرفي وامتلاء الشعيرات وحرارة الجلد ولونه.',
        notes: 'الشرايين تنقل الدم بعيدًا عن القلب، والأوردة تعيده إليه.',
        alert: 'البرودة المفاجئة أو فقدان النبض في أحد الأطراف يحتاج تقييمًا عاجلًا.'
      }
    ]
  },

  respiratory: {
    name: 'الجهاز التنفسي',
    english: 'Respiratory System',
    icon: '🫁',
    organs: [
      {
        id: 'lungs',
        name: 'الرئتان',
        english: 'Lungs',
        icon: '🫁',
        model: 'models/anatomy/lungs.glb',
        structure: 'تتكون الرئة اليمنى من ثلاثة فصوص، واليسرى من فصين، وتحتويان على الحويصلات الهوائية.',
        function: 'تبادل الأكسجين وثاني أكسيد الكربون بين الهواء والدم.',
        assessment: 'تقييم معدل التنفس وعمقه وتشبع الأكسجين وأصوات الرئة.',
        notes: 'تتم عملية تبادل الغازات داخل الحويصلات الهوائية.',
        alert: 'ضيق التنفس الشديد أو انخفاض تشبع الأكسجين يتطلب تقييمًا عاجلًا.'
      },
      {
        id: 'trachea',
        name: 'القصبة الهوائية',
        english: 'Trachea',
        icon: '🫁',
        model: 'models/anatomy/trachea.glb',
        structure: 'أنبوب مدعّم بحلقات غضروفية يمتد من الحنجرة وينقسم إلى شعبتين رئيسيتين.',
        function: 'توصيل الهواء من الجهاز التنفسي العلوي إلى الشعب الهوائية.',
        assessment: 'ملاحظة نمط التنفس ووجود إفرازات أو انسداد أو أصوات غير طبيعية.',
        notes: 'تساعد الحلقات الغضروفية على إبقاء مجرى الهواء مفتوحًا.',
        alert: 'انسداد مجرى الهواء حالة طارئة.'
      }
    ]
  },

  digestive: {
    name: 'الجهاز الهضمي',
    english: 'Digestive System',
    icon: '🫃',
    organs: [
      {
        id: 'stomach',
        name: 'المعدة',
        english: 'Stomach',
        icon: '🫃',
        model: 'models/anatomy/stomach.glb',
        structure: 'عضو عضلي أجوف يتكون جداره من طبقات عضلية ومخاطية.',
        function: 'تخزين الطعام وخلطه بالعصارة المعدية وبدء هضم البروتين.',
        assessment: 'تقييم الألم والغثيان والقيء والانتفاخ ونمط التغذية.',
        notes: 'تساعد البيئة الحمضية في المعدة على عملية الهضم.',
        alert: 'القيء الدموي أو الألم البطني الشديد يحتاج تقييمًا عاجلًا.'
      },
      {
        id: 'liver',
        name: 'الكبد',
        english: 'Liver',
        icon: '🟤',
        model: 'models/anatomy/liver.glb',
        structure: 'أكبر عضو داخلي صلب في الجسم، ويتكون تشريحيًا من فصوص وفصيصات كبدية.',
        function: 'استقلاب المغذيات وإنتاج العصارة الصفراوية والمساهمة في إزالة السموم.',
        assessment: 'متابعة اليرقان ولون البول والبراز ونتائج وظائف الكبد حسب الخطة العلاجية.',
        notes: 'يقع في الجزء العلوي الأيمن من البطن.',
        alert: 'ظهور اليرقان مع اضطراب الوعي أو النزيف يحتاج تقييمًا عاجلًا.'
      },
      {
        id: 'intestines',
        name: 'الأمعاء',
        english: 'Intestines',
        icon: '🧬',
        model: 'models/anatomy/intestines.glb',
        structure: 'تتكون من الأمعاء الدقيقة والأمعاء الغليظة.',
        function: 'امتصاص المغذيات والماء وتكوين البراز.',
        assessment: 'تقييم أصوات الأمعاء وحركة الإخراج والألم وانتفاخ البطن.',
        notes: 'يحدث معظم امتصاص العناصر الغذائية في الأمعاء الدقيقة.',
        alert: 'ألم البطن الشديد المصحوب بقيء مستمر أو انتفاخ شديد يحتاج تقييمًا عاجلًا.'
      }
    ]
  },

  urinary: {
    name: 'الجهاز البولي',
    english: 'Urinary System',
    icon: '🫘',
    organs: [
      {
        id: 'kidneys',
        name: 'الكليتان',
        english: 'Kidneys',
        icon: '🫘',
        model: 'models/anatomy/kidneys.glb',
        structure: 'عضوان على شكل حبة الفاصوليا، يحتويان على القشرة والنخاع والحوض الكلوي.',
        function: 'ترشيح الدم وتنظيم السوائل والأملاح وإنتاج البول.',
        assessment: 'متابعة كمية البول ولونه وضغط الدم ووظائف الكلى.',
        notes: 'تقع الكليتان خلف التجويف البريتوني.',
        alert: 'قلة البول الشديدة أو انقطاعه يحتاج تقييمًا طبيًا.'
      },
      {
        id: 'bladder',
        name: 'المثانة البولية',
        english: 'Urinary Bladder',
        icon: '💧',
        model: 'models/anatomy/bladder.glb',
        structure: 'عضو عضلي أجوف يقع داخل الحوض.',
        function: 'تخزين البول حتى عملية التبول.',
        assessment: 'تقييم نمط التبول وكمية البول ووجود ألم أو احتباس.',
        notes: 'تتمدد المثانة مع امتلائها بالبول.',
        alert: 'احتباس البول المؤلم يحتاج تقييمًا عاجلًا.'
      }
    ]
  },

  nervous: {
    name: 'الجهاز العصبي',
    english: 'Nervous System',
    icon: '🧠',
    organs: [
      {
        id: 'brain',
        name: 'الدماغ',
        english: 'Brain',
        icon: '🧠',
        model: 'models/anatomy/brain.glb',
        structure: 'يتكون من المخ والمخيخ وجذع الدماغ، ويحتوي على مناطق متخصصة بوظائف مختلفة.',
        function: 'تنظيم الحركة والإحساس والتفكير والذاكرة والوظائف الحيوية.',
        assessment: 'تقييم مستوى الوعي والحدقات والاستجابة الحركية والحسية.',
        notes: 'يحمي الجمجمة الدماغ من الإصابات الخارجية.',
        alert: 'ضعف أحد جانبي الجسم أو اضطراب الكلام المفاجئ قد يشير إلى سكتة دماغية.'
      },
      {
        id: 'spinal-cord',
        name: 'الحبل الشوكي',
        english: 'Spinal Cord',
        icon: '🧠',
        model: 'models/anatomy/spinal-cord.glb',
        structure: 'حزمة من النسيج العصبي تمتد داخل القناة الفقرية.',
        function: 'نقل الإشارات العصبية بين الدماغ والجسم والمشاركة في المنعكسات.',
        assessment: 'تقييم القوة العضلية والإحساس والمنعكسات حسب الحالة.',
        notes: 'يمتد داخل العمود الفقري وتحميه الفقرات والسحايا.',
        alert: 'فقدان الحركة أو الإحساس المفاجئ يستدعي تقييمًا عاجلًا.'
      }
    ]
  },

  skeletal: {
    name: 'الجهاز الهيكلي',
    english: 'Skeletal System',
    icon: '🦴',
    organs: [
      {
        id: 'skeleton',
        name: 'الهيكل العظمي',
        english: 'Human Skeleton',
        icon: '🦴',
        model: 'models/anatomy/skeleton.glb',
        structure: 'يتكون الهيكل العظمي للبالغ عادة من 206 عظمة.',
        function: 'دعم الجسم وحماية الأعضاء والمساعدة في الحركة وتكوين خلايا الدم وتخزين المعادن.',
        assessment: 'تقييم الحركة والألم والتشوهات وسلامة الأطراف.',
        notes: 'ينقسم الهيكل العظمي إلى هيكل محوري وهيكل طرفي.',
        alert: 'الألم الشديد أو التشوه بعد إصابة يستدعي تقييمًا طبيًا.'
      },
      {
        id: 'spine',
        name: 'العمود الفقري',
        english: 'Vertebral Column',
        icon: '🦴',
        model: 'models/anatomy/spine.glb',
        structure: 'يتكون عادة من 33 فقرة تشمل الفقرات العنقية والصدرية والقطنية والعجزية والعصعصية.',
        function: 'دعم الجسم وحماية الحبل الشوكي والمساعدة في الحركة.',
        assessment: 'تقييم وضعية الجسم والحركة والألم والإحساس والقوة العضلية.',
        notes: 'الأقراص بين الفقرات تساعد على امتصاص الصدمات.',
        alert: 'الإصابة المصحوبة بضعف أو تنميل جديد تتطلب تقييمًا عاجلًا.'
      }
    ]
  }
};

/* =========================================
   FULL BODY LAYER MANIFEST
========================================= */

const bodyLayers = {
  skin: 'models/anatomy/body-skin.glb',
  muscles: 'models/anatomy/body-muscles.glb',
  skeleton: 'models/anatomy/body-skeleton.glb',
  organs: 'models/anatomy/body-organs.glb'
};

/* =========================================
   QUIZ DATA
========================================= */

const quizQuestions = [
  {
    question: 'ما الوظيفة الأساسية للقلب؟',
    options: [
      'هضم الطعام',
      'ضخ الدم',
      'تنقية الهواء',
      'تخزين البول'
    ],
    answer: 1,
    explanation: 'القلب يضخ الدم إلى الرئتين وإلى باقي أجزاء الجسم.'
  },
  {
    question: 'أين يحدث تبادل الغازات في الرئتين؟',
    options: [
      'القصبة الهوائية',
      'الحنجرة',
      'الحويصلات الهوائية',
      'البلعوم'
    ],
    answer: 2,
    explanation: 'تحدث عملية تبادل الأكسجين وثاني أكسيد الكربون في الحويصلات الهوائية.'
  },
  {
    question: 'ما الوحدة الوظيفية الأساسية للكلى؟',
    options: [
      'النيفرون',
      'الحويصلة',
      'العصبون',
      'العضلة'
    ],
    answer: 0,
    explanation: 'النيفرون هو الوحدة التركيبية والوظيفية الأساسية للكلى.'
  },
  {
    question: 'كم عدد عظام الهيكل العظمي للإنسان البالغ عادة؟',
    options: [
      '106',
      '156',
      '206',
      '306'
    ],
    answer: 2,
    explanation: 'يتكون الهيكل العظمي للبالغ عادة من 206 عظمة.'
  }
];

/* =========================================
   THREE.JS VIEWER
========================================= */

let scene;
let camera;
let renderer;
let controls;
let animationFrame;

let autoRotate = false;
let currentSystem = null;
let currentOrgan = null;
let requestNumber = 0;

const loadedBodyLayers = new Set();

function initViewer() {
  scene = new THREE.Scene();

  scene.background = new THREE.Color(0xf1f5fa);

  camera = new THREE.PerspectiveCamera(
    45,
    stage.clientWidth / stage.clientHeight,
    0.1,
    1000
  );

  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  );

  renderer.setSize(
    stage.clientWidth,
    stage.clientHeight
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  stage.appendChild(renderer.domElement);

  controls = new OrbitControls(
    camera,
    renderer.domElement
  );

  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1;
  controls.maxDistance = 15;

  const ambient = new THREE.AmbientLight(
    0xffffff,
    2
  );

  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(
    0xffffff,
    2
  );

  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(
    0x9bbcff,
    0.8
  );

  fillLight.position.set(-5, 2, -4);
  scene.add(fillLight);

  animate();

  window.addEventListener('resize', resizeViewer);
}

function animate() {
  animationFrame = requestAnimationFrame(animate);

  if (autoRotate) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
  } else {
    controls.autoRotate = false;
  }

  controls.update();
  renderer.render(scene, camera);
}

function resizeViewer() {
  if (!renderer || !camera) return;

  const width = stage.clientWidth;
  const height = stage.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

/* =========================================
   VIEWER CONTROLS
========================================= */

function resetCamera() {
  camera.position.set(0, 0, 5);
  controls.target.set(0, 0, 0);
  controls.update();
}

$('rotate-toggle')?.addEventListener('click', () => {
  autoRotate = !autoRotate;
});

$('reset-view')?.addEventListener('click', resetCamera);

$('zoom-in')?.addEventListener('click', () => {
  camera.position.multiplyScalar(0.85);
  controls.update();
});

$('zoom-out')?.addEventListener('click', () => {
  camera.position.multiplyScalar(1.15);
  controls.update();
});

/* =========================================
   LOADING UI
========================================= */

function showLoading(message = 'جاري تحميل النموذج...') {
  if (!loadingElement) return;

  loadingElement.hidden = false;

  const paragraph = loadingElement.querySelector('p');

  if (paragraph) {
    paragraph.textContent = message;
  }
}

function hideLoading() {
  if (loadingElement) {
    loadingElement.hidden = true;
  }
}

/* =========================================
   MODEL LOADING
========================================= */

async function loadBodyLayer(layerId) {
  const url = bodyLayers[layerId];

  if (!url) return false;

  const existing = getAnatomyLayer(`body-${layerId}`);

  if (existing) {
    toggleAnatomyLayer(`body-${layerId}`, true);
    loadedBodyLayers.add(layerId);
    return true;
  }

  showLoading(`جاري تحميل طبقة ${layerId}...`);

  try {
    await loadAnatomyLayer({
      id: `body-${layerId}`,
      url,
      scene,
      onProgress: (percent) => {
        showLoading(`تحميل ${layerId}: ${percent}%`);
      }
    });

    loadedBodyLayers.add(layerId);

    return true;

  } catch (error) {
    console.error(`Failed to load ${layerId}:`, error);
    return false;
  }
}

async function loadOrganModel(organ) {
  const thisRequest = ++requestNumber;

  if (!organ?.model) return;

  showLoading(`جاري تحميل ${organ.name}...`);

  removeAnatomyLayer('current-organ');

  try {
    const model = await loadAnatomyLayer({
      id: 'current-organ',
      url: organ.model,
      scene,
      onProgress: (percent) => {
        if (thisRequest === requestNumber) {
          showLoading(`تحميل ${organ.name}: ${percent}%`);
        }
      }
    });

    // تجاهل أي طلب قديم انتهى بعد اختيار عضو جديد
    if (thisRequest !== requestNumber) {
      removeAnatomyLayer('current-organ');
      return;
    }

    centerAndScaleOrgan(model);

    hideLoading();

  } catch (error) {
    if (thisRequest !== requestNumber) return;

    console.error('Organ model loading error:', error);

    showLoading(
      `تعذر تحميل نموذج ${organ.name}. تحقق من وجود ملف GLB والمسار.`
    );
  }
}

/* =========================================
   ORGAN MODEL TRANSFORM
========================================= */

function centerAndScaleOrgan(model) {
  // هذه المعالجة مخصصة لنموذج العضو المنفرد فقط.
  // لا نعيد تحجيم طبقات الجسم المستقلة حتى لا نفقد محاذاتها.

  const box = new THREE.Box3().setFromObject(model);

  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());

  model.position.sub(center);

  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  if (maxDimension > 0) {
    const scale = 2.5 / maxDimension;
    model.scale.setScalar(scale);
  }

  resetCamera();
}

/* =========================================
   BODY LAYERS CONTROLS
========================================= */

async function handleLayerChange(layerId, visible) {
  const id = `body-${layerId}`;

  if (visible) {
    const success = await loadBodyLayer(layerId);

    if (!success) {
      const checkbox = document.querySelector(
        `[data-layer="${layerId}"]`
      );

      if (checkbox) checkbox.checked = false;

      showLoading(
        `لم يتم العثور على ملف الطبقة: ${bodyLayers[layerId]}`
      );

      return;
    }

    toggleAnatomyLayer(id, true);

  } else {
    toggleAnatomyLayer(id, false);
  }

  hideLoading();
}

document.querySelectorAll('[data-layer]').forEach((checkbox) => {
  checkbox.addEventListener('change', (event) => {
    const layerId = event.currentTarget.dataset.layer;

    handleLayerChange(
      layerId,
      event.currentTarget.checked
    );
  });
});

$('show-all-layers')?.addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('[data-layer]');

  for (const checkbox of checkboxes) {
    checkbox.checked = true;
    await handleLayerChange(checkbox.dataset.layer, true);
  }
});

$('hide-all-layers')?.addEventListener('click', () => {
  document.querySelectorAll('[data-layer]').forEach((checkbox) => {
    checkbox.checked = false;

    toggleAnatomyLayer(
      `body-${checkbox.dataset.layer}`,
      false
    );
  });

  hideLoading();
});

/* =========================================
   ORGAN INFORMATION
========================================= */

function selectOrgan(organ) {
  if (!organ) return;

  currentOrgan = organ;

  $('organ-name').textContent = organ.name;
  $('organ-subtitle').textContent = organ.english;
  $('organ-icon').textContent = organ.icon;

  $('organ-structure').textContent = organ.structure;
  $('organ-function').textContent = organ.function;
  $('organ-assessment').textContent = organ.assessment;
  $('organ-notes').textContent = organ.notes;

  const alertElement = $('organ-alert');

  alertElement.textContent = organ.alert || '';
  alertElement.hidden = !organ.alert;

  loadOrganModel(organ);
}

function populateOrganPicker(system) {
  const picker = $('organ-picker');

  picker.innerHTML = '';

  system.organs.forEach((organ) => {
    const option = document.createElement('option');

    option.value = organ.id;
    option.textContent = `${organ.name} - ${organ.english}`;

    picker.appendChild(option);
  });
}

$('organ-picker')?.addEventListener('change', (event) => {
  const organ = currentSystem.organs.find(
    (item) => item.id === event.target.value
  );

  selectOrgan(organ);
});

/* =========================================
   SYSTEM SELECTION
========================================= */

function selectSystem(systemId) {
  const system = anatomySystems[systemId];

  if (!system) return;

  currentSystem = system;

  document.querySelectorAll('.system-button').forEach((button) => {
    button.classList.toggle(
      'active',
      button.dataset.system === systemId
    );
  });

  $('viewer-title').textContent = system.name;
  $('viewer-kicker').textContent = system.english;

  populateOrganPicker(system);

  selectOrgan(system.organs[0]);
}

document.querySelectorAll('.system-button').forEach((button) => {
  button.addEventListener('click', () => {
    selectSystem(button.dataset.system);
  });
});

/* =========================================
   QUIZ
========================================= */

let currentQuestionIndex = 0;
let questionAnswered = false;

function renderQuestion() {
  const question = quizQuestions[currentQuestionIndex];

  if (!question) return;

  questionAnswered = false;

  $('quiz-question').textContent =
    `${currentQuestionIndex + 1}. ${question.question}`;

  $('quiz-feedback').textContent = '';

  $('quiz-options').innerHTML = '';

  question.options.forEach((option, index) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = option;

    button.addEventListener('click', () => {
      answerQuestion(index);
    });

    $('quiz-options').appendChild(button);
  });

  $('next-question').textContent =
    currentQuestionIndex === quizQuestions.length - 1
      ? 'إعادة الاختبار'
      : 'السؤال التالي';
}

function answerQuestion(selectedIndex) {
  if (questionAnswered) return;

  questionAnswered = true;

  const question = quizQuestions[currentQuestionIndex];
  const buttons = $('quiz-options').querySelectorAll('button');

  buttons.forEach((button, index) => {
    button.disabled = true;

    if (index === question.answer) {
      button.style.borderColor = '#16a34a';
      button.style.background = 'rgba(22,163,74,0.12)';
    } else if (index === selectedIndex) {
      button.style.borderColor = '#dc3545';
      button.style.background = 'rgba(220,53,69,0.10)';
    }
  });

  if (selectedIndex === question.answer) {
    $('quiz-feedback').textContent =
      `✅ إجابة صحيحة! ${question.explanation}`;
  } else {
    $('quiz-feedback').textContent =
      `❌ إجابة غير صحيحة. ${question.explanation}`;
  }
}

$('next-question')?.addEventListener('click', () => {
  if (currentQuestionIndex >= quizQuestions.length - 1) {
    currentQuestionIndex = 0;
  } else {
    currentQuestionIndex++;
  }

  renderQuestion();
});

/* =========================================
   THEME
========================================= */

$('anatomy-theme-toggle')?.addEventListener('click', () => {
  const page = document.querySelector('.anatomy-page');

  page.classList.toggle('dark-mode');

  const button = $('anatomy-theme-toggle');

  button.textContent = page.classList.contains('dark-mode')
    ? '☀️'
    : '🌙';

  if (scene) {
    scene.background = new THREE.Color(
      page.classList.contains('dark-mode')
        ? 0x101827
        : 0xf1f5fa
    );
  }
});

/* =========================================
   INITIALIZATION
========================================= */

function initializeAnatomy() {
  initViewer();

  renderQuestion();

  selectSystem('circulatory');

  console.log('Nursing Hub Anatomy Explorer initialized.');
}

initializeAnatomy();

/* =========================================
   CLEANUP
========================================= */

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(animationFrame);

  window.removeEventListener('resize', resizeViewer);

  controls?.dispose();

  renderer?.dispose();

  removeAllAnatomyLayers();
});
