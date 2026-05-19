import React, { useRef, useState, useEffect, useCallback } from "react";
import video from "./assets/sample-video.mp4";
import music from "./assets/sample-music.mp3";

// ─── Scene Data ────────────────────────────────────────────────────────────────
const SCENES = [
  {
    index: 0,
    sentence: "This is a simple Javascript test",
    textPosition: "middle-center",
    textAnimation: "typing",
    media: "https://miro.medium.com/max/1024/1*OK8xc3Ic6EGYg2k6BeGabg.jpeg",
    duration: 3,
    type: "image",
  },
  {
    index: 1,
    sentence: "Here comes the video!",
    textPosition: "top-right",
    textAnimation: "blink",
    media: video,
    duration: 5,
    type: "video",
    startOffset: 3,
  },
];

const TOTAL_DURATION = SCENES.reduce((s, sc) => s + sc.duration, 0); // 8s

// ─── Text animation helpers ────────────────────────────────────────────────────

function getTypedChars(sentence, sceneLocalTime) {
  return Math.min(sentence.length, Math.floor(sceneLocalTime / 0.06));
}

function getBlinkVisible(sceneLocalTime) {
  return Math.floor(sceneLocalTime / 0.5) % 2 === 0;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CanvasVideoPlayer({ width = 1280, height = 720 }) {
  const canvasRef = useRef(null);
  const videoRef  = useRef(null);
  const imageRef  = useRef(new Image());
  const rafRef    = useRef(null);

  const playbackStartTs  = useRef(null);
  const pausedElapsed    = useRef(0);

  const videoSeekDone = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isStopped, setIsStopped] = useState(true);

  // ── Preload scene 0 image ──────────────────────────────────────────────────
  useEffect(() => {
    imageRef.current.crossOrigin = "anonymous";
    imageRef.current.src = SCENES[0].media;
  }, []);

  // ── Background music (Jotaro theme, hardcoded) ─────────────────────────────
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(music);
    audio.loop   = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // ── Elapsed time helper ────────────────────────────────────────────────────
  const getElapsed = useCallback(() => {
    if (isStopped) return 0;
    if (isPlaying && playbackStartTs.current != null) {
      return (performance.now() - playbackStartTs.current) / 1000 + pausedElapsed.current;
    }
    return pausedElapsed.current;
  }, [isPlaying, isStopped]);

  // ── Play / Pause toggle ────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (isStopped) {
      pausedElapsed.current  = 0;
      playbackStartTs.current = performance.now();
      videoSeekDone.current  = false;
      setIsStopped(false);
      setIsPlaying(true);
    } else if (isPlaying) {
      pausedElapsed.current  = getElapsed();
      playbackStartTs.current = null;
      setIsPlaying(false);
    } else {
      playbackStartTs.current = performance.now();
      setIsPlaying(true);
    }
  }, [getElapsed, isPlaying, isStopped]);

  // ── Stop & reset (double-click) ────────────────────────────────────────────
  const resetPlayback = useCallback(() => {
    setIsPlaying(false);
    setIsStopped(true);
    pausedElapsed.current   = 0;
    playbackStartTs.current = null;
    videoSeekDone.current   = false;

    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }

    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font      = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Click to play", canvas.width / 2, canvas.height / 2);
  }, []);

  // ── Attach canvas click / dblclick listeners ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("click",    togglePlay);
    canvas.addEventListener("dblclick", resetPlayback);
    return () => {
      canvas.removeEventListener("click",    togglePlay);
      canvas.removeEventListener("dblclick", resetPlayback);
    };
  }, [togglePlay, resetPlayback]);

  // ── Main render loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // Draw idle screen when stopped
    if (isStopped) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font      = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Click to play", W / 2, H / 2);
      return;
    }

    const draw = () => {
      const elapsed  = getElapsed();
      const clamped  = Math.min(elapsed, TOTAL_DURATION);

      // ── Which scene? ──
      let sceneIdx      = SCENES.length - 1;
      let sceneStart    = 0;
      let acc           = 0;
      for (let i = 0; i < SCENES.length; i++) {
        if (clamped < acc + SCENES[i].duration) {
          sceneIdx   = i;
          sceneStart = acc;
          break;
        }
        acc += SCENES[i].duration;
      }
      const scene          = SCENES[sceneIdx];
      const sceneLocalTime = clamped - sceneStart;

      ctx.clearRect(0, 0, W, H);

      // ── Draw media ──
      if (scene.type === "image") {
        const img = imageRef.current;
        if (img && img.complete && img.naturalWidth > 0) {
          const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
          const dw    = img.naturalWidth  * scale;
          const dh    = img.naturalHeight * scale;
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } else {
          ctx.fillStyle = "#222";
          ctx.fillRect(0, 0, W, H);
        }
        if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();

      } else if (scene.type === "video") {
        const vid = videoRef.current;
        if (vid) {
          if (!videoSeekDone.current) {
            vid.currentTime   = scene.startOffset ?? 0;
            videoSeekDone.current = true;
          }
          if (isPlaying && vid.paused)  vid.play().catch(() => {});
          if (!isPlaying && !vid.paused) vid.pause();

          if (vid.readyState >= 2) {
            ctx.drawImage(vid, 0, 0, W, H);
          } else {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, W, H);
          }
        }
      }

      // ── Draw text with animation ──
      ctx.save();
      ctx.font         = "bold 32px 'Courier New', monospace";
      ctx.shadowColor  = "rgba(0,0,0,0.85)";
      ctx.shadowBlur   = 14;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      let displayText = "";

      if (scene.textAnimation === "typing") {
        const chars = getTypedChars(scene.sentence, sceneLocalTime);
        displayText  = scene.sentence.slice(0, chars);
        if (chars < scene.sentence.length) displayText += "█";
      } else if (scene.textAnimation === "blink") {
        displayText = getBlinkVisible(sceneLocalTime) ? scene.sentence : "";
      } else {
        displayText = scene.sentence;
      }

      const positions = {
        "top-left":      { x: 40,    y: 50,   align: "left"   },
        "top-center":    { x: W / 2, y: 50,   align: "center" },
        "top-right":     { x: W - 40,y: 50,   align: "right"  },
        "middle-left":   { x: 40,    y: H / 2,align: "left"   },
        "middle-center": { x: W / 2, y: H / 2,align: "center" },
        "middle-right":  { x: W - 40,y: H / 2,align: "right"  },
        "bottom-left":   { x: 40,    y: H - 40,align: "left"  },
        "bottom-center": { x: W / 2, y: H - 40,align: "center"},
        "bottom-right":  { x: W - 40,y: H - 40,align: "right" },
      };
      const pos        = positions[scene.textPosition] ?? positions["middle-center"];
      ctx.textAlign    = pos.align;
      ctx.textBaseline = "middle";
      ctx.fillStyle    = "white";
      ctx.fillText(displayText, pos.x, pos.y);
      ctx.restore();

      // ── Progress bar ──
      const progress = Math.min(1, clamped / TOTAL_DURATION);
      ctx.fillStyle  = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, H - 4, W, 4);
      ctx.fillStyle  = "#4fc3f7";
      ctx.fillRect(0, H - 4, W * progress, 4);

      // ── End of playback ──
      if (clamped >= TOTAL_DURATION) {
        setIsPlaying(false);
        setIsStopped(true);
        pausedElapsed.current   = 0;
        playbackStartTs.current = null;
        videoSeekDone.current   = false;
        if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
        rafRef.current = null;
        return;
      }

      if (isPlaying) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        rafRef.current = null;
      }
    };

    if (isPlaying && !rafRef.current) {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [isPlaying, isStopped, getElapsed]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "100%", textAlign: "center", fontFamily: "'Courier New', monospace" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          maxWidth: `${width}px`,
          aspectRatio: `${width}/${height}`,
          cursor: "pointer",
          background: "#000",
          display: "block",
          margin: "0 auto",
        }}
      />

      <video
        ref={videoRef}
        src={SCENES[1].media}
        crossOrigin="anonymous"
        style={{ display: "none" }}
        playsInline
      />

      <div style={{ marginTop: 8 }}>
        <strong>Status:</strong>{" "}
        {isStopped ? "Stopped" : isPlaying ? "Playing" : "Paused"}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
        Click canvas to play/pause. Double-click to stop & reset.
      </div>
    </div>
  );
}
