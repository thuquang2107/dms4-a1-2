const video = document.getElementById('videoInput');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
let detections = [];


// --- FACE API ---
async function loadFaceAPIModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('static/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('static/models');
  await faceapi.nets.faceExpressionNet.loadFromUri('static/models');
  console.log('✅ Face API models loaded');
}

async function setupWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.play();
    resizeElements();
    requestAnimationFrame(animate);
  };
}

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
     requestAnimationFrame(detectFace);

}

// --- Face Detection Loop ---
async function detectFace() {
  if(video.readyState < 2) return;
  detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();
  requestAnimationFrame(detectFace);



  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  if (detections.length > 0) {
    const resized = faceapi.resizeResults(detections, { width: overlay.width, height: overlay.height });
    faceapi.draw.drawDetections(overlay, resized);
    faceapi.draw.drawFaceLandmarks(overlay, resized);
  }
}

function animate() {
  detectFace();
  requestAnimationFrame(animate);
}

function resizeElements() {
  overlay.width = window.innerWidth;
  overlay.height = window.innerHeight;
}

// --- EFFECT STATES ---
let isStrobeActive = false;
let isTileEffectActive = false;
let isParticleActive = false;

let bgEffect = 'particles'; // default

// --- BUTTONS ---
document.getElementById('strobe-btn').addEventListener('click', () => {
  isStrobeActive = !isStrobeActive;
  isTileEffectActive = false;
  isParticleActive = false;
});
document.getElementById('tile-btn').addEventListener('click', () => {
  isTileEffectActive = !isTileEffectActive;
  isStrobeActive = false;
  isParticleActive = false;
});
document.getElementById('prt-btn').addEventListener('click', () => {
  isParticleActive = !isParticleActive;
  isTileEffectActive = false;
  isStrobeActive = false;
});


  // BG effect buttons
  document.getElementById('rgb-btn').addEventListener('click', () => {
    bgEffect = (bgEffect === 'rgb') ? 'none' : 'rgb';
});

document.getElementById('dist-btn').addEventListener('click', () => {
    bgEffect = (bgEffect === 'distorted') ? 'none' : 'distorted';
});

// thêm nút Reset BG nếu muốn





  //BG canvas
  let bgSketch = (p)=>{
  p.allParticles = [];
  p.maxParticles = 8000;  
  let maskGraphics;

  p.setup = ()=>{
    let c = p.createCanvas(window.innerWidth, window.innerHeight);
    c.parent('bg-container');
    maskGraphics = p.createGraphics(p.width, p.height);
    p.noStroke();
    p.colorMode(p.HSB, 360, 100, 100, 100);
  };

  p.draw = ()=>{
    p.clear();
    maskGraphics.clear();

    // --- Mask vùng người ---
    if(detections.length > 0){
      maskGraphics.fill(255);
      maskGraphics.noStroke();
      detections.forEach(d => {
        maskGraphics.beginShape();
        d.landmarks.positions.forEach(pt => maskGraphics.vertex(pt.x, pt.y));
        maskGraphics.endShape(p.CLOSE);
      });
    }

    switch(bgEffect){
      case 'particles':
        // tạo particle mới
        for(let i=0; i<5; i++){
          let px = p.random(p.width), py = p.random(p.height);
          if(maskGraphics.get(px, py)[0] < 128){ // ngoài người
            if(p.allParticles.length < p.maxParticles){
              p.allParticles.push({
                x: px,
                y: py,
                vx: p.random(-1,1),
                vy: p.random(-1,1),
                h: p.frameCount % 360
              });
            }
          }
        }
        // update & vẽ particle
        for(let i = p.allParticles.length-1; i>=0; i--){
          let particle = p.allParticles[i];
          particle.x += particle.vx;
          particle.y += particle.vy;
          p.fill(particle.h, 80, 100, 40);
          p.circle(particle.x, particle.y, 8);

          if(particle.x<0||particle.x>p.width||particle.y<0||particle.y>p.height){
            p.allParticles.splice(i,1);
          }
        }
        break;

      case 'rgb':
        for(let x=0; x<p.width; x+=20){
          for(let y=0; y<p.height; y+=20){
            if(maskGraphics.get(x,y)[0]<128){
              let r = (p.sin(p.frameCount*0.1 + x*0.05)*127+128);
              let g = (p.sin(p.frameCount*0.15 + y*0.05)*127+128);
              let b = (p.sin(p.frameCount*0.2 + x*0.05 + y*0.05)*127+128);
              p.fill(r,g,b,150);
              p.rect(x,y,20,20);
            }
          }
        }
        break;

      case 'distorted':
  let time = p.frameCount * 0.05;

  // --- chọn 1 hoặc 2 màu cố định khi bắt đầu ---
  if(!p.distColors){
    p.distColors = [];
    let hue1 = p.random(360);
    p.distColors.push(hue1);
    if(p.random() < 0.5){ // 50% có màu thứ 2
      p.distColors.push((hue1 + p.random(30,150)) % 360);
    }
  }

  for(let x=0; x<p.width; x+=20){
    for(let y=0; y<p.height; y+=20){
      if(maskGraphics.get(x,y)[0]<128){ // ngoài người
        let offsetX = Math.sin(time + x*0.03 + y*0.02) * 20 + p.noise(x*0.01, y*0.01, time)*30;
        let offsetY = Math.cos(time + x*0.02 + y*0.03) * 20 + p.noise(x*0.01, y*0.01, time+100)*30;

        // chọn 1 trong các màu cố định
        let hue = p.distColors[Math.floor(p.random(p.distColors.length))];
        let sat = 80 + p.sin(time + x*0.05)*20;
        let bri = 70 + p.cos(time + y*0.05)*30;

        p.fill(hue, sat, bri, 50); // alpha thấp
        p.noStroke();

        let size = 10 + Math.sin(time + x*0.1 + y*0.1)*8;
        p.ellipse(x + offsetX, y + offsetY, size, size);
      }
    }
  }

        break;
    }
  };

  p.windowResized = ()=> p.resizeCanvas(window.innerWidth, window.innerHeight);
};


// --- P5 SKETCH ---
let particles = [];

let effectsSketch = (p) => {
  p.setup = () => {
    let c = p.createCanvas(window.innerWidth, window.innerHeight);
    c.id('effectsCanvas');
    c.style('pointer-events', 'none');
    p.noStroke();
    p.clear();
  };

  p.draw = () => {
    p.clear();

    if (isStrobeActive) {
      drawStrobe(p);
    } else if (isTileEffectActive) {
      drawTile(p);
    } else if (isParticleActive) {
      drawParticleBurst(p);
    }
  };

  // --- Disco Strobe ---
  function drawStrobe(p) {
  p.background(0, 0, 0, 40);
  p.rectMode(p.CENTER); // Vẽ hình chữ nhật từ tâm
  p.noStroke();

  // Nhấp nháy nhanh hơn một chút
  if (p.frameCount % 3 === 0) {
    p.blendMode(p.ADD);

    // Vẽ 5-10 hình khối ngẫu nhiên
    let numShapes = p.random(5, 10);
    for (let i = 0; i < numShapes; i++) {
      let x = p.random(p.width);
      let y = p.random(p.height);
      let size = p.random(50, 200);
      
      // Chọn màu neon (Hồng/Tím, Xanh Cyan/Lam)
      let hue = p.random([280, 320, 180, 220]);
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.fill(hue, 90, 100, 50); // Màu rực rỡ, hơi trong suốt

      // Thêm hiệu ứng "glow" bằng cách vẽ nhiều lớp
      p.drawingContext.shadowBlur = 32;
      p.drawingContext.shadowColor = p.color(hue, 90, 100);
      
      // 50% là hình tròn, 50% là hình chữ nhật xoay
      if (p.random() > 0.5) {
        p.ellipse(x, y, size, size);
      } else {
        p.push();
        p.translate(x, y);
        p.rotate(p.random(p.TWO_PI));
        p.rect(0, 0, size, size);
        p.pop();
      }
    }

    // Reset các hiệu ứng
    p.drawingContext.shadowBlur = 0;
    p.blendMode(p.BLEND);
    p.colorMode(p.RGB);
  }
}

  // --- Moving Tiles ---
  function drawTile(p) {
  // Nền đen mờ để tạo vệt chuyển động
  p.background(0, 20); 
  p.rectMode(p.CENTER);
  p.colorMode(p.HSB, 360, 100, 100, 100);

  let tileSize = 80;
  let time = p.frameCount * 0.03; // Biến thời gian chính

  // Vòng lặp để tạo lưới
  for (let x = 0; x < p.width + tileSize; x += tileSize) {
    for (let y = 0; y < p.height + tileSize; y += tileSize) {

      // --- TÍNH TOÁN CÁC GIÁ TRỊ BIẾN ĐỔI ---

      // 1. Noise để tạo sự rung giật ngẫu nhiên cho mỗi ô
      let noiseFactor = p.noise(x * 0.01, y * 0.01, time);
      
      // 2. Sóng lan tỏa từ tâm, được điều khiển bởi noise
      let distToCenter = p.dist(x, y, p.width / 2, p.height / 2);
      let wave = p.sin(distToCenter * 0.02 - time * 2);

      // 3. Kích thước (size) co giãn theo sóng
      let size = p.map(wave, -1, 1, tileSize * 0.1, tileSize * 1.5);
      
      // 4. Góc xoay (rotation) hỗn loạn, kết hợp cả noise và sóng
      let rotation = p.map(noiseFactor, 0, 1, 0, p.TWO_PI) + wave * 2;
      
      // 5. Màu sắc (hue & saturation) thay đổi ảo giác
      let hue = (distToCenter * 0.3 + time * 30) % 360;
      let saturation = p.map(p.cos(distToCenter * 0.05 - time), -1, 1, 50, 100);

      // --- BẮT ĐẦU VẼ ---
      p.push(); // Lưu lại trạng thái vẽ hiện tại
      p.translate(x, y); // Di chuyển đến vị trí của ô
      p.rotate(rotation); // Xoay theo góc đã tính

      // Vẽ nhiều hình chữ nhật lồng vào nhau để tạo hiệu ứng "cổng không gian"
      for (let i = 0; i < 5; i++) {
        let currentSize = size * (1 - i * 0.2); // Mỗi hình nhỏ dần
        let currentHue = (hue + i * 20) % 360; // Mỗi lớp có màu hơi khác
        
        // Lớp bên trong càng sáng và mỏng hơn
        let brightness = 100 - i * 10;
        let alpha = 80 - i * 15;
        let weight = p.map(i, 0, 5, 4, 1);

        p.strokeWeight(weight);
        p.stroke(currentHue, saturation, brightness, alpha);
        p.noFill();
        
        p.rect(0, 0, currentSize, currentSize);
      }
      
      p.pop(); // Phục hồi lại trạng thái vẽ
    }
  }

  p.colorMode(p.RGB); // Reset về chế độ màu mặc định
}  
  

  // --- Particle Burst ---
  let particles = [];
  function drawParticleBurst(p) {
    p.clear();
  p.colorMode(p.HSB, 360, 100, 100, 100);
  p.blendMode(p.ADD); // làm sáng khi các line chồng lên nhau

  let speed = 0.12; // tốc độ dao động
  let layers = 12;  // số tầng sóng
let amp = Math.max(p.width, p.height) / 2;

  // --- Sóng ngang ---
  for (let i = 0; i < layers; i++) {
    let y = p.sin(p.frameCount * speed + i * 0.6) * amp + p.height / 2;
    let hue = (i * 30 + p.frameCount * 3) % 360;
    let weight = p.map(p.sin(p.frameCount * 0.1 + i), -1, 1, 2, 12);

    p.stroke(hue, 100, 100, 60);
    p.strokeWeight(weight);
    p.line(0, y, p.width, y);
  }

  // --- Sóng dọc ---
  for (let j = 0; j < layers; j++) {
    let x = p.cos(p.frameCount * speed + j * 0.6) * amp + p.width / 2;
    let hue = (p.frameCount * 4 + j * 40) % 360;
    let weight = p.map(p.cos(p.frameCount * 0.15 + j), -1, 1, 2, 10);

    p.stroke(hue, 80, 100, 40);
    p.strokeWeight(weight);
    p.line(x, 0, x, p.height);
  }

  // --- Glow mờ ---
  p.noStroke();
  p.fill(0, 0, 0, 10);
  p.rect(0, 0, p.width, p.height);
  p.colorMode(p.RGB);
  p.blendMode(p.BLEND);
  }

  p.windowResized = () => p.resizeCanvas(window.innerWidth, window.innerHeight);
};

window.onload = async () => {
  await loadFaceAPIModels();
  await setupWebcam();
  new p5(effectsSketch);
   new p5(bgSketch);
  window.addEventListener('resize', resizeElements);
};


