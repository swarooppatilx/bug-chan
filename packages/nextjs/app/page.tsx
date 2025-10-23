"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";

const Home: NextPage = () => {
  // Parallax microinteractions (spring + damping)
  const [pos, setPos] = useState({ x: 0, y: 0 }); // state for rendering
  const targetRef = useRef({ x: 0, y: 0 }); // mouse target (-1..1)
  const posRef = useRef({ x: 0, y: 0 }); // internal animated position
  const velRef = useRef({ x: 0, y: 0 }); // velocity
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));
    const SPRING = 0.06; // lower = softer
    const DAMPING = 0.85; // lower = more friction

    let running = true;
    const loop = () => {
      const tx = targetRef.current.x;
      const ty = targetRef.current.y;
      const px = posRef.current.x;
      const py = posRef.current.y;

      velRef.current.x = (velRef.current.x + (tx - px) * SPRING) * DAMPING;
      velRef.current.y = (velRef.current.y + (ty - py) * SPRING) * DAMPING;

      posRef.current.x = px + velRef.current.x;
      posRef.current.y = py + velRef.current.y;

      // Snap tiny values to zero near origin for stillness
      if (Math.abs(posRef.current.x) < 0.0005 && Math.abs(tx) < 0.0005) posRef.current.x = 0;
      if (Math.abs(posRef.current.y) < 0.0005 && Math.abs(ty) < 0.0005) posRef.current.y = 0;

      setPos({ x: posRef.current.x, y: posRef.current.y });
      if (running) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = clamp((e.clientX / innerWidth) * 2 - 1);
      const y = clamp((e.clientY / innerHeight) * 2 - 1);
      targetRef.current = { x, y };
    };

    // Robust “left the viewport” detection
    const resetToOrigin = () => {
      targetRef.current = { x: 0, y: 0 };
    };
    const onPointerOut = (e: PointerEvent) => {
      if (e.relatedTarget === null) resetToOrigin();
    };
    const onMouseOut = (e: MouseEvent) => {
      // @ts-ignore
      if (!e.relatedTarget && !e.toElement) resetToOrigin();
    };
    const onBlur = () => resetToOrigin();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") resetToOrigin();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("mouseout", onMouseOut, { passive: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const parallaxStyle = (dx = 8, dy = dx) => ({
    transform: `translate3d(${pos.x * dx}px, ${pos.y * dy}px, 0)`,
    willChange: "transform",
  });

  return (
    <div className="h-full bg-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column - Text */}
          <div className="hidden md:block lg:col-span-3 space-y-8  lg:h-[600px]" style={parallaxStyle(6)}>
            <div className="grid grid-rows-12 h-full">
              <div className="lg:row-span-2">
                <h2 className="text-2xl lg:text-3xl font-roboto font-thin mb-2 text-white">
                  Create bug
                  <br />
                  bounty programs
                  <br />
                  on web3.
                </h2>
              </div>
              <div className="lg:row-end-12">
                <h2 className="text-2xl lg:text-3xl font-roboto font-thin mb-2 text-white">
                  Fully transparent
                  <br />
                  and auditable.
                </h2>
              </div>
            </div>
          </div>

          {/* Center Column - Hero Image */}
          <div className="lg:col-span-6 relative" style={parallaxStyle(10)}>
            <div className="relative w-full h-96 lg:h-[500px]">
              <Image src="/hero/bugs_gone.svg" alt="BUGS GONE" fill style={{ objectFit: "contain" }} priority />
              {/* Shield Icon */}
              <div
                className="absolute -top-0 -left-25 w-32 h-32 hidden md:block lg:w-50 lg:h-50"
                style={parallaxStyle(16)}
              >
                <Image src="/hero/shield.svg" alt="Shield" fill style={{ objectFit: "contain" }} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-6 justify-center mt-8" style={parallaxStyle(8)}>
              <Link
                href="/bounties/create"
                className="bg-[var(--color-primary)] hover:opacity-90 text-white px-10 py-6 flex flex-row items-center gap-3 transform -rotate-6 transition-all duration-300 hover:rotate-0 hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-primary)]/20 active:scale-95 group"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-akira text-lg">START A PROGRAM</span>
                  </div>
                  <div className="text-sm font-roboto font-normal">Start a bug bounty program</div>
                </div>
                <div className="relative w-10 h-10 inline-block transition-transform duration-300 group-hover:translate-x-1">
                  <Image src="/hero/right_arrow.svg" alt="Right Arrow" fill style={{ objectFit: "contain" }} />
                </div>
              </Link>

              <Link
                href="/bounties"
                className="bg-[var(--color-primary)] hover:opacity-90 px-10 py-6 relative transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-primary)]/20 active:scale-95 group"
                style={parallaxStyle(6)}
              >
                <div className="flex flex-col gap-1">
                  <div className="font-akira text-lg mb-1">REPORT BUGS</div>
                  <div className="text-sm font-roboto font-normal">Earn by submitting bug reports</div>
                </div>
                {/* Bug Icon (already has hover rotation/scale) */}
                <div className="absolute -right-20 -bottom-20 w-50 h-50 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
                  <Image src="/hero/bug.svg" alt="Bug" fill style={{ objectFit: "contain" }} />
                </div>
              </Link>
            </div>
          </div>

          {/* Right Column - Text */}
          <div className="lg:col-span-3 hidden md:block" style={parallaxStyle(6)}>
            <div>
              <h2 className="text-2xl lg:text-3xl font-roboto font-thin mb-2 text-white">Hackers stake some</h2>
              <h2 className="text-2xl lg:text-3xl font-roboto font-thin mb-2 text-white">amount before submitting</h2>
              <h2 className="text-2xl lg:text-3xl font-roboto font-thin text-white">reports to avoid spam.</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
