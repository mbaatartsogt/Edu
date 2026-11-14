import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const COLORS = {
  skin: '#F3C29B', skinDark: '#E3A57C', hair: '#4A2C1E', cap: '#2563EB', capDark: '#1D4ED8',
  shirt: '#1F2A44', shirtDark: '#18213A', jeans: '#7CA0D6', shoe: '#F8FAFC', sole: '#2563EB',
  iris: '#3B2416', lips: '#8E3B3B', blush: '#FF8F8F', book: '#2563EB', yellow: '#F6C530',
};

/** Канвас дээр зурж бэлдсэн текстур (лого, номын нүүр) */
function canvasTex(draw, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const mLogo = (bg, fg) => canvasTex((g, w, h) => {
  g.fillStyle = bg; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = fg; g.lineWidth = 26; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(78, 172); g.lineTo(78, 90); g.lineTo(128, 140); g.lineTo(178, 90); g.lineTo(178, 172); g.stroke();
});
const bookCover = () => canvasTex((g, w, h) => {
  g.fillStyle = COLORS.book; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, 26, h);
  g.font = '900 104px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText('AB', w / 2 + 40, h / 2 - 20);
  g.textAlign = 'left'; g.fillStyle = COLORS.yellow; g.fillText('C', w / 2 + 44, h / 2 - 20);
  g.font = '800 34px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('ENGLISH', w / 2 + 10, h / 2 + 70);
}, 320, 400);
const shadowTex = () => canvasTex((g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(11,29,74,.38)'); gr.addColorStop(0.55, 'rgba(11,29,74,.14)'); gr.addColorStop(1, 'rgba(11,29,74,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

function mat(color, roughness = 0.55, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
}

/** Дүрийг бүтээнэ. Буцаах утга: хөдөлгөөнд хэрэгтэй хэсгүүд */
function buildKid() {
  const root = new THREE.Group();
  const add = (parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
    parent.add(m);
    return m;
  };
  const skin = mat(COLORS.skin, 0.5);
  const skinDark = mat(COLORS.skinDark, 0.55);
  const hair = mat(COLORS.hair, 0.7);
  const shirt = mat(COLORS.shirt, 0.92);
  const shirtDark = mat(COLORS.shirtDark, 0.95);

  // ---- Хөл, гутал ----
  const jeans = mat(COLORS.jeans, 0.85);
  for (const sx of [-1, 1]) {
    add(root, new THREE.CapsuleGeometry(0.17, 0.5, 8, 20), jeans, [sx * 0.21, 0.55, 0]);
    add(root, new RoundedBoxGeometry(0.36, 0.2, 0.56, 4, 0.08), mat(COLORS.shoe, 0.45), [sx * 0.22, 0.1, 0.08]);
    add(root, new RoundedBoxGeometry(0.37, 0.05, 0.57, 2, 0.02), mat(COLORS.sole, 0.5), [sx * 0.22, 0.025, 0.08]);
  }

  // ---- Их бие (цамц) ----
  const torso = new THREE.Group();
  torso.position.set(0, 0.95, 0);
  root.add(torso);
  add(torso, new THREE.CapsuleGeometry(0.54, 0.38, 10, 32), shirt, [0, 0.32, 0], [0, 0, 0], [1.14, 1, 0.84]);
  add(torso, new RoundedBoxGeometry(0.62, 0.26, 0.1, 3, 0.05), shirtDark, [0, 0.08, 0.4], [-0.15, 0, 0]);
  add(torso, new THREE.TorusGeometry(0.24, 0.085, 12, 32), shirtDark, [0, 0.8, 0.02], [Math.PI / 2 - 0.15, 0, 0]);
  for (const sx of [-1, 1]) {
    add(torso, new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), mat('#F1F5F9', 0.5), [sx * 0.08, 0.6, 0.39], [-0.25, 0, 0]);
    add(torso, new THREE.SphereGeometry(0.035, 12, 12), mat('#F1F5F9', 0.5), [sx * 0.08, 0.45, 0.43]);
  }
  const chestLogo = add(torso, new THREE.CircleGeometry(0.12, 40), new THREE.MeshStandardMaterial({ map: mLogo(COLORS.yellow, COLORS.capDark), roughness: 0.6 }),
    [0.25, 0.5, 0.425], [-0.12, 0.25, 0]);
  chestLogo.renderOrder = 2;

  // ---- Хүзүү ----
  add(root, new THREE.CylinderGeometry(0.16, 0.18, 0.28, 20), skinDark, [0, 1.82, 0]);

  // ---- Зүүн гар: ном барьсан ----
  const armL = new THREE.Group();
  armL.position.set(-0.62, 1.58, 0.02);
  armL.rotation.set(-0.75, 0, 0.32);
  root.add(armL);
  add(armL, new THREE.CapsuleGeometry(0.15, 0.5, 8, 20), shirt, [0, -0.36, 0]);
  add(armL, new THREE.SphereGeometry(0.14, 20, 20), skin, [0.02, -0.72, 0.02]);
  const book = new THREE.Group();
  book.position.set(-0.22, 1.18, 0.62);
  book.rotation.set(-0.1, 0.32, 0.12);
  root.add(book);
  add(book, new RoundedBoxGeometry(0.5, 0.64, 0.12, 3, 0.03), mat(COLORS.capDark, 0.5));
  add(book, new THREE.BoxGeometry(0.46, 0.6, 0.1), mat('#F8FAFC', 0.7), [0.015, 0, 0]);
  add(book, new THREE.PlaneGeometry(0.5, 0.64), new THREE.MeshStandardMaterial({ map: bookCover(), roughness: 0.5 }), [0, 0, 0.062]);

  // ---- Баруун гар: даллаж байна ----
  const armR = new THREE.Group();
  armR.position.set(0.62, 1.58, 0.02);
  root.add(armR);
  const armRInner = new THREE.Group();
  armR.add(armRInner);
  add(armRInner, new THREE.CapsuleGeometry(0.15, 0.55, 8, 20), shirt, [0, 0.38, 0]);
  const hand = new THREE.Group();
  hand.position.set(0, 0.84, 0.02);
  armRInner.add(hand);
  add(hand, new THREE.SphereGeometry(0.16, 24, 20), skin, [0, 0, 0], [0, 0, 0], [1, 1.05, 0.6]);
  [-0.09, -0.03, 0.03, 0.09].forEach((fx, i) => {
    add(hand, new THREE.CapsuleGeometry(0.035, 0.13 - Math.abs(i - 1.5) * 0.02, 6, 10), skin, [fx, 0.19 - Math.abs(i - 1.5) * 0.015, 0], [0, 0, -fx * 0.8]);
  });
  add(hand, new THREE.CapsuleGeometry(0.038, 0.1, 6, 10), skin, [-0.16, 0.02, 0.02], [0, 0, 0.9]);

  // ---- Толгой ----
  const head = new THREE.Group();
  head.position.set(0, 1.9, 0);
  root.add(head);
  const H = 0.62; // толгойн төвийн өндөр (head group дотор)
  add(head, new THREE.SphereGeometry(0.74, 48, 40), skin, [0, H, 0], [0, 0, 0], [1, 0.98, 0.94]);
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.15, 20, 20), skin, [sx * 0.72, H - 0.02, -0.02], [0, 0, 0], [0.55, 1, 0.8]);
    add(head, new THREE.SphereGeometry(0.075, 16, 16), skinDark, [sx * 0.76, H - 0.02, 0.01], [0, 0, 0], [0.4, 1, 0.8]);
  }
  // Үс: ар тал, хажуу, духан дээрх үзүүрүүд
  add(head, new THREE.SphereGeometry(0.775, 40, 30, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, [0, H + 0.02, -0.04], [-0.55, 0, 0]);
  // Духны үс: малгайн доор нимгэн зурвас
  add(head, new THREE.SphereGeometry(0.752, 48, 8, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.36, Math.PI * 0.07), hair, [0, H, 0], [0, 0, 0], [1, 0.98, 0.95]);
  for (const sx of [-1, 1]) add(head, new THREE.CapsuleGeometry(0.06, 0.16, 6, 10), hair, [sx * 0.66, H + 0.12, 0.18], [0, 0, sx * 0.1]);

  // Малгай
  const cap = mat(COLORS.cap, 0.5);
  add(head, new THREE.SphereGeometry(0.8, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.46), cap, [0, H + 0.1, -0.03], [-0.16, 0, 0]);
  add(head, new THREE.TorusGeometry(0.77, 0.03, 10, 64), mat(COLORS.capDark, 0.5), [0, H + 0.17, -0.02], [Math.PI / 2 - 0.16, 0, 0]);
  add(head, new THREE.SphereGeometry(0.07, 16, 16), mat(COLORS.capDark, 0.5), [0, H + 0.9, -0.16]);
  const brim = add(head, new THREE.CylinderGeometry(0.6, 0.6, 0.06, 48, 1, false, -Math.PI / 2, Math.PI), mat(COLORS.capDark, 0.5),
    [0, H + 0.26, 0.4], [0.3, 0, 0], [1, 1, 1.15]);
  brim.castShadow = true;
  add(head, new THREE.CircleGeometry(0.17, 40), new THREE.MeshStandardMaterial({ map: mLogo(COLORS.yellow, COLORS.capDark), roughness: 0.5 }),
    [0, H + 0.55, 0.64], [-0.62, 0, 0]);

  // Нүүр — нүдийг тусад нь эргүүлнэ
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * 0.27, H + 0.02, 0.55);
    head.add(eye);
    add(eye, new THREE.SphereGeometry(0.19, 32, 24), mat('#FFFFFF', 0.12), [0, 0, 0], [0, 0, 0], [1, 1.15, 0.75]);
    const ball = new THREE.Group();
    eye.add(ball);
    add(ball, new THREE.SphereGeometry(0.115, 32, 24), mat(COLORS.iris, 0.2), [0, 0, 0.11], [0, 0, 0], [1, 1.08, 0.45]);
    add(ball, new THREE.SphereGeometry(0.06, 20, 16), mat('#0B0B10', 0.15), [0, 0, 0.155], [0, 0, 0], [1, 1, 0.4]);
    add(ball, new THREE.SphereGeometry(0.032, 12, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }), [0.045, 0.05, 0.17]);
    add(ball, new THREE.SphereGeometry(0.016, 10, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }), [-0.04, -0.04, 0.17]);
    eyes.push({ eye, ball });
  }
  const brows = [];
  for (const sx of [-1, 1]) {
    brows.push(add(head, new THREE.CapsuleGeometry(0.028, 0.15, 6, 10), hair, [sx * 0.28, H + 0.3, 0.6], [0.3, 0, Math.PI / 2 + sx * 0.12]));
  }
  add(head, new THREE.SphereGeometry(0.065, 20, 16), skinDark, [0, H - 0.13, 0.72], [0, 0, 0], [1, 0.85, 0.9]);
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.11, 20, 16), mat(COLORS.blush, 0.6, { transparent: true, opacity: 0.45 }),
      [sx * 0.43, H - 0.18, 0.55], [0, sx * 0.55, 0], [1, 0.62, 0.25]);
  }
  const mouth = new THREE.Group();
  mouth.position.set(0, H - 0.3, 0.66);
  mouth.rotation.x = -0.25;
  head.add(mouth);
  add(mouth, new THREE.TorusGeometry(0.12, 0.016, 10, 32, Math.PI), mat('#7A2E2E', 0.45), [0, 0.05, 0], [0, 0, Math.PI]);
  const mouthOpen = add(mouth, new THREE.SphereGeometry(0.1, 24, 16), mat('#4A1A1E', 0.6), [0, -0.035, -0.03], [0, 0, 0], [1, 0.01, 0.35]);

  // ---- Газрын сүүдэр ----
  const shadow = add(root, new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }),
    [0, 0.005, 0.1], [-Math.PI / 2, 0, 0]);

  return { root, torso, head, eyes, brows, mouthOpen, armR, armRInner, shadow };
}

/**
 * 3D маскот. x, y — курсорын байрлал (−1…1), near — ойр байдал (0…1), excited — үсрэх.
 * Зөвхөн дэлгэц дээр харагдаж байх үед зурна (батерей хэмнэнэ).
 */
export default function Mascot3D({ x, y, near, excited, onPoke, onFail }) {
  const host = useRef(null);
  const excitedRef = useRef(excited);
  excitedRef.current = excited;

  useEffect(() => {
    const el = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch { onFail?.(); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.55;

    scene.add(new THREE.HemisphereLight('#ffffff', '#c7d6ee', 1.1));
    const key = new THREE.DirectionalLight('#fff4e8', 2.4); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight('#9cc4ff', 1.8); rim.position.set(4, 3, -4); scene.add(rim);
    const fill = new THREE.DirectionalLight('#ffffff', 0.6); fill.position.set(3, 1, 5); scene.add(fill);

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    camera.position.set(0, 2.5, 9.2);
    camera.lookAt(0, 1.58, 0);

    const kid = buildKid();
    scene.add(kid.root);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Өндрөөр нь багтаана; нарийн байвал холдуулна
      camera.position.z = 9.2 * Math.max(1, 0.78 / camera.aspect);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    const clock = new THREE.Clock();
    let raf = 0, blinkAt = 2 + Math.random() * 3, jumpT = -1, wasExcited = false;
    const lerp = THREE.MathUtils.lerp;
    const s = { hy: 0, hx: 0, ey: 0, ex: 0, near: 0 };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const cx = x.get(), cy = y.get(), nr = near.get();
      const k = 1 - Math.pow(0.0015, dt);

      // Толгой курсор руу
      // Доош харахдаа малгай нүдийг халхлахгүйн тулд хязгаарлана
      s.hy = lerp(s.hy, cx * 0.5, k); s.hx = lerp(s.hx, cy > 0 ? cy * 0.14 : cy * 0.26, k);
      s.ey = lerp(s.ey, cx * 0.42, Math.min(1, k * 1.6)); s.ex = lerp(s.ex, cy * 0.42, Math.min(1, k * 1.6));
      s.near = lerp(s.near, nr, k);
      kid.head.rotation.set(s.hx, s.hy, -cx * 0.08);
      kid.torso.rotation.y = s.hy * 0.22;
      kid.eyes.forEach(({ ball }) => ball.rotation.set(s.ex, s.ey, 0));

      // Нүд анивчих
      if (t > blinkAt) blinkAt = t + 2.2 + Math.random() * 3;
      const until = blinkAt - t;
      const blinkScale = until < 0.16 ? Math.max(0.08, Math.abs(until - 0.08) / 0.08) : 1;
      kid.eyes.forEach(({ eye }) => { eye.scale.y = blinkScale; });

      // Хөмсөг, ам
      kid.brows.forEach((b) => { b.position.y = 0.62 + 0.3 + s.near * 0.06; });
      kid.mouthOpen.scale.y = 0.01 + s.near * 0.55;

      // Гар даллах
      const wave = Math.sin(t * 6) * 0.28 * (0.6 + 0.4 * Math.sin(t * 0.7) ** 2);
      kid.armR.rotation.set(0, 0, -0.42 + wave);
      kid.armRInner.rotation.set(-0.1, 0, 0);

      // Амьсгал, үсрэлт
      if (excitedRef.current && !wasExcited) jumpT = 0;
      wasExcited = excitedRef.current;
      let jump = 0;
      if (jumpT >= 0) { jumpT += dt; jump = Math.max(0, Math.sin(Math.min(1, jumpT / 0.5) * Math.PI)) * 0.5; if (jumpT > 0.5) jumpT = -1; }
      kid.root.position.y = jump + Math.sin(t * 2) * 0.012;
      kid.torso.scale.set(1, 1 + Math.sin(t * 2) * 0.008, 1);
      kid.shadow.scale.setScalar(1 - jump * 0.5);
      kid.shadow.position.y = 0.005 - kid.root.position.y;

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; if (m) { (Array.isArray(m) ? m : [m]).forEach((mm) => { mm.map?.dispose(); mm.dispose(); }); } });
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [x, y, near, onFail]);

  return <div ref={host} onClick={onPoke} className="h-full w-full cursor-pointer" role="img" aria-label="MindEdu-гийн 3D маскот хүүхэд гараа даллаж, курсорыг дагаж харж байна" />;
}
