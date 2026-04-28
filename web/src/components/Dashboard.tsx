"use client";

import { ChatPanel } from "./ChatPanel";

export function Dashboard() {
    return (
        <div className="flex flex-1 overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
            <ChatPanel />
        </div>
    );
}
