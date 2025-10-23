"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Bounties",
    href: "/bounties",
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
  },
  {
    label: "Reports",
    href: "/reports",
  },
  {
    label: "About",
    href: "/about",
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href} className="list-none">
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "text-white" : "text-white"
              } hover:text-[var(--color-secondary)] transition-all duration-300 text-lg antialiased font-roboto font-light relative group`}
            >
              {icon}
              <span>{label}</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-secondary)] group-hover:w-full transition-all duration-300"></span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="w-full bg-black border-b border-gray-800 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95 transition-all duration-300">
      <div className="flex items-center justify-between min-h-16 max-w-7xl py-5 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <Link href="/" passHref className="flex items-center gap-2 shrink-0 group">
            <div className="relative w-32 h-8 transition-transform duration-300 group-hover:scale-105">
              <Image
                alt="BugChan logo"
                className="cursor-pointer"
                fill
                src="/logo.svg"
                style={{ objectFit: "contain" }}
              />
            </div>
          </Link>
        </div>

        <div className="hidden lg:flex flex-1 justify-center">
          <ul className="flex items-center gap-8 px-1">
            <HeaderMenuLinks />
          </ul>
        </div>

        <div className="flex flex-1 justify-end items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <RainbowKitCustomConnectButton />
            {isLocalNetwork && <FaucetButton />}
          </div>

          <details className="lg:hidden relative" ref={burgerMenuRef}>
            <summary className="px-3 py-2 hover:bg-[var(--color-secondary)]/10 cursor-pointer transition-all duration-200 active:scale-95">
              <Bars3Icon className="h-6 w-6 text-white transition-transform duration-200" />
            </summary>
            <ul
              className="absolute right-0 mt-3 p-2 shadow-lg bg-black border border-[var(--color-secondary)]/30 w-52 animate-in fade-in slide-in-from-top-2 duration-200"
              onClick={() => {
                burgerMenuRef?.current?.removeAttribute("open");
              }}
            >
              <HeaderMenuLinks />
              <li className="mt-2 px-2 list-none">
                <RainbowKitCustomConnectButton />
              </li>
              {isLocalNetwork && (
                <li className="px-2 list-none">
                  <FaucetButton />
                </li>
              )}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
};
