export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-neutral-50 px-6 py-10">
      <div className="mx-auto w-full max-w-sm rounded-xl border bg-white p-6">
        <div className="text-lg font-semibold">登录</div>
        <div className="mt-1 text-sm text-neutral-600">MVP：先搭建页面壳，鉴权后续接入。</div>

        <form className="mt-6 space-y-3">
          <label className="block">
            <div className="text-sm font-medium">账号</div>
            <input className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <div className="text-sm font-medium">密码</div>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="password" />
          </label>

          <button
            className="mt-2 w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
            type="button"
          >
            继续（占位）
          </button>
        </form>
      </div>
    </main>
  );
}
