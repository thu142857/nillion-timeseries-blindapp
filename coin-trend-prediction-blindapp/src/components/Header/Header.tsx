import React from "react";
import { Link } from "react-router-dom";

export default function Header() {

    return (
        <div className="header flex flex-col w-full bg-transparent py-8 px-2">
            <div className="header__content flex flex-row justify-between items-center w-full bg-transparent max-w-[1280px] m-auto">
                <Link to="/">
                    <img
                        src="/nillion-word.svg"
                        alt="Nillion"
                        width={100}
                        height={30}
                    />
                </Link>
                <div className="header__nav flex flex-row justify-between gap-x-8 items-center">
                    <h2 className="text-[20px] text-white">Coin trend prediction</h2>
                    <div className="author-container flex flex-col gap-y-2 items-end">
                        <span className="text-[14px] text-white">uthz</span>
                        <span className="text-[14px] text-white">daningyn</span>
                    </div>
                </div>
            </div>
        </div>
    );
}