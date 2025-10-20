"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";

const Home: NextPage = () => {
  // const { address: connectedAddress } = useAccount();

  return (
    <div className="h-full bg-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column - Text */}
          <div className="hidden md:block lg:col-span-3 space-y-8  lg:h-[600px]">
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
          <div className="lg:col-span-6 relative">
            <div className="relative w-full h-96 lg:h-[500px]">
              <Image src="/hero/bugs_gone.svg" alt="BUGS GONE" fill style={{ objectFit: "contain" }} priority />
              {/* Shield Icon */}
              <div className="absolute -top-0 -left-25 w-32 h-32 hidden md:block lg:w-50 lg:h-50">
                <Image src="/hero/shield.svg" alt="Shield" fill style={{ objectFit: "contain" }} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-6 justify-center mt-8">
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
              >
                <div className="flex flex-col gap-1">
                  <div className="font-akira text-lg mb-1">REPORT BUGS</div>
                  <div className="text-sm font-roboto font-normal">Earn by submitting bug reports</div>
                </div>
                {/* Bug Icon */}
                <div className="absolute -right-20 -bottom-20 w-50 h-50 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
                  <Image src="/hero/bug.svg" alt="Bug" fill style={{ objectFit: "contain" }} />
                </div>
              </Link>
            </div>
          </div>

          {/* Right Column - Text */}
          <div className="lg:col-span-3 hidden md:block">
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
