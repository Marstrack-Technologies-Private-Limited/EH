import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Send, ArrowLeft, MessagesSquare, Search } from "lucide-react";
import { Card } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { EmptyState } from "@/components/ui/empty-state.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { OnlineDot } from "@/components/online-dot.jsx";
import { useApp } from "@/store/app-store.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useIsMobile } from "@/hooks/use-media-query.js";
import { cn, timeAgo } from "@/lib/utils.js";

function convoIdFor(a, b) {
  return `conv_${[a, b].sort().join("__")}`;
}

export default function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { user: me } = useAuth();
  const isMobile = useIsMobile();
  const [text, setText] = useState("");
  const endRef = useRef(null);

  // conversations involving me, newest activity first
  const myConvos = useMemo(() => {
    return state.conversations
      .filter((c) => c.participants.includes(me.id))
      .map((c) => {
        const otherId = c.participants.find((p) => p !== me.id);
        const other = state.users.find((u) => u.id === otherId);
        const last = c.messages[c.messages.length - 1];
        return { ...c, other, last };
      })
      .filter((c) => c.other)
      .sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0));
  }, [state.conversations, state.users, me.id]);

  // resolve active conversation from the route
  const activeOther = userId ? state.users.find((u) => u.id === userId) : null;
  const existing = activeOther
    ? state.conversations.find(
        (c) => c.participants.includes(me.id) && c.participants.includes(activeOther.id),
      )
    : myConvos[0]
      ? state.conversations.find((c) => c.id === myConvos[0].id)
      : null;

  const other = activeOther || myConvos[0]?.other || null;
  const messages = existing?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, other?.id]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !other) return;
    const convoId = existing?.id || convoIdFor(me.id, other.id);
    dispatch({
      type: "SEND_MESSAGE",
      conversationId: convoId,
      participants: [me.id, other.id],
      message: { id: `m_${Date.now()}`, senderId: me.id, text: text.trim(), ts: Date.now() },
    });
    setText("");
  };

  const showList = !isMobile || !userId;
  const showThread = !isMobile || !!userId;

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Messages</h1>
      <Card className="flex min-h-0 flex-1 overflow-hidden p-0">
        {/* conversation list */}
        {showList && (
          <div className="flex w-full flex-col border-r md:w-80">
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search messages…" className="pl-9 h-9" readOnly />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {myConvos.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No conversations yet. Find someone in Discover and say hi.
                </p>
              ) : (
                myConvos.map((c) => {
                  const active = other?.id === c.other.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/chat/${c.other.id}`)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-accent cursor-pointer",
                        active && "bg-accent",
                      )}
                    >
                      <UserAvatar user={c.other} className="size-11" showStatus />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{c.other.name}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {c.last ? timeAgo(c.last.ts) : ""}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.last?.senderId === me.id && "You: "}
                          {c.last?.text}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* thread */}
        {showThread && (
          <div className="flex min-w-0 flex-1 flex-col">
            {other ? (
              <>
                <div className="flex items-center gap-3 border-b p-3">
                  {isMobile && (
                    <Button variant="ghost" size="icon-sm" onClick={() => navigate("/chat")}>
                      <ArrowLeft className="size-4" />
                    </Button>
                  )}
                  <UserAvatar user={other} className="size-10" showStatus />
                  <div className="min-w-0 flex-1">
                    <Link to={`/u/${other.id}`} className="truncate font-semibold hover:underline">
                      {other.name}
                    </Link>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <OnlineDot online={other.online} />
                      {other.online ? "Online now" : `Active ${timeAgo(other.lastActive)}`}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin bg-muted/20 p-4">
                  {messages.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Say hello to {other.name.split(" ")[0]} 👋
                    </p>
                  )}
                  {messages.map((m) => {
                    const mine = m.senderId === me.id;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                            mine
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-card",
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {timeAgo(m.ts)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <form onSubmit={send} className="flex items-center gap-2 border-t p-3">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Message ${other.name.split(" ")[0]}…`}
                  />
                  <Button type="submit" size="icon" disabled={!text.trim()}>
                    <Send className="size-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState
                  icon={MessagesSquare}
                  title="Your messages"
                  description="Select a conversation, or start one from a profile in Discover."
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
