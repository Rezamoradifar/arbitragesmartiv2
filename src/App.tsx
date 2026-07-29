import { useState } from "react";
import { CONTRACT_ADDRESS, POLYGONSCAN_URL } from "./contract";
import {
  fmtBps,
  fmtDuration,
  fmtUsdt,
  shortAddr,
  useGlobalData,
  useUserData,
} from "./useContractData";

const PLAN_NAMES = ["برنزی", "نقره‌ای", "طلایی", "الماس"];

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

function RiskBanner() {
  return (
    <div className="risk-banner">
      <strong>هشدار ریسک — این یک ابزار مشاهده‌ی داده‌ی آن‌چین است، نه توصیه‌ی سرمایه‌گذاری.</strong>
      <p>
        این قرارداد سود روزانه‌ی ثابت (تا ۳٪ در روز) و پورتال دعوت چندسطحی ارائه می‌دهد که
        از نظر ساختاری شبیه طرح‌های Ponzi/HYIP است. مالک قرارداد (OWNER) می‌تواند هر زمان تا
        ۲۰٪ از کل موجودی USDT را با عنوان «آربیتراژ» برداشت کند، بدون هیچ اثبات آن‌چین از
        بازگشت سود. قبل از واریز هرگونه وجه، قرارداد را خودتان بررسی کنید یا از یک حسابرس
        مستقل کمک بگیرید. این داشبورد فقط داده می‌خواند و هیچ تراکنش واریز/برداشتی انجام نمی‌دهد.
      </p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function GlobalSection() {
  const { data, error, loading } = useGlobalData();

  if (loading && !data) return <div className="panel">در حال خواندن داده از قرارداد…</div>;
  if (error && !data) return <div className="panel error">خطا: {error}</div>;
  if (!data) return null;

  return (
    <>
      <section className="grid">
        <StatCard label="تعداد کاربران" value={data.userCount.toString()} />
        <StatCard
          label="مجموع سرمایه‌گذاری‌شده"
          value={`${fmtUsdt(data.totalStaked, data.usdtDecimals)} ${data.usdtSymbol}`}
        />
        <StatCard
          label="مجموع پرداختی"
          value={`${fmtUsdt(data.totalPaidOut, data.usdtDecimals)} ${data.usdtSymbol}`}
        />
        <StatCard
          label="موجودی فعلی قرارداد"
          value={`${fmtUsdt(data.contractBalance, data.usdtDecimals)} ${data.usdtSymbol}`}
        />
        <StatCard
          label="سقف برداشت «آربیتراژ» owner"
          value={`${fmtUsdt(data.arbitrageAvailable, data.usdtDecimals)} ${data.usdtSymbol}`}
          sub="۲۰٪ از موجودی، هر زمان قابل برداشت توسط OWNER"
        />
        <StatCard
          label="وضعیت"
          value={data.paused ? "متوقف (Paused)" : data.emergencyMode ? "حالت اضطراری" : "فعال"}
        />
        <StatCard
          label="دوره‌ی رایگان"
          value={data.isFreePeriod ? "فعال" : "پایان‌یافته"}
          sub={data.isFreePeriod ? `${fmtDuration(data.timeLeftSec)} باقی‌مانده` : undefined}
        />
        <StatCard label="رأی‌های اضطراری" value={`${data.emergencyVoteCount} / ${data.requiredVotes}`} />
      </section>

      <section className="panel">
        <h2>پلن‌های استیک</h2>
        <table>
          <thead>
            <tr>
              <th>پلن</th>
              <th>نرخ روزانه</th>
              <th>مدت</th>
              <th>حداقل مبلغ</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_NAMES.map((name, i) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{fmtBps(data.dailyRates[i])}</td>
                <td>{data.planDurations[i].toString()} روز</td>
                <td>
                  {fmtUsdt(data.minStakes[i], data.usdtDecimals)} {data.usdtSymbol}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>نرخ رفرال (F1 / F2 به ازای هر پلن)</h2>
        <table>
          <thead>
            <tr>
              <th>پلن</th>
              <th>F1</th>
              <th>F2</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_NAMES.map((name, i) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{fmtBps(data.referralRates[i * 2])}</td>
                <td>{fmtBps(data.referralRates[i * 2 + 1])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">F3 (سطح سوم): {data.f3Rates.map(fmtBps).join(" / ")}</p>
      </section>

      <section className="panel">
        <h2>آدرس‌های قرارداد</h2>
        <ul className="addr-list">
          <li>
            <span>قرارداد</span>
            <a href={POLYGONSCAN_URL} target="_blank" rel="noreferrer">
              {shortAddr(CONTRACT_ADDRESS)}
            </a>
          </li>
          <li>
            <span>OWNER</span>
            <span>{shortAddr(data.owner)}</span>
          </li>
          <li>
            <span>کیف پول کارمزد ۱ (۷.۵٪)</span>
            <span>{shortAddr(data.feeWallet1)}</span>
          </li>
          <li>
            <span>کیف پول کارمزد ۲ (۲.۵٪)</span>
            <span>{shortAddr(data.feeWallet2)}</span>
          </li>
          <li>
            <span>توکن {data.usdtSymbol}</span>
            <span>{shortAddr(data.usdtAddress)}</span>
          </li>
        </ul>
        {data.partners.length > 0 && (
          <>
            <h3>پارتنرها ({data.partnerCount.toString()})</h3>
            <ul className="addr-list">
              {data.partners.map((p) => (
                <li key={p}>
                  <span>پارتنر</span>
                  <span>{shortAddr(p)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}

function UserLookup() {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const { data, error, loading } = useUserData(address);
  const { data: global } = useGlobalData();

  async function connectReadOnly() {
    if (!window.ethereum) {
      alert("ولتی (مثل متامسک) در مرورگر پیدا نشد.");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts?.[0]) {
        setInput(accounts[0]);
        setAddress(accounts[0]);
      }
    } catch {
      // user rejected connection
    }
  }

  return (
    <section className="panel">
      <h2>مشاهده‌ی وضعیت یک آدرس</h2>
      <p className="hint">فقط خواندن اطلاعات — هیچ تراکنشی ارسال نمی‌شود.</p>
      <div className="lookup-row">
        <input
          type="text"
          placeholder="0x..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={() => setAddress(input.trim())}>جست‌وجو</button>
        <button onClick={connectReadOnly} className="secondary">
          دریافت آدرس از ولت
        </button>
      </div>

      {loading && <p>در حال خواندن…</p>}
      {error && <p className="error">{error}</p>}

      {data && global && (
        <div className="grid">
          <StatCard
            label="مبلغ استیک"
            value={`${fmtUsdt(data.stakeAmount, global.usdtDecimals)} ${global.usdtSymbol}`}
            sub={data.freeStake ? "استیک رایگان" : undefined}
          />
          <StatCard label="پلن" value={PLAN_NAMES[Number(data.plan)] ?? "-"} />
          <StatCard label="نرخ روزانه" value={fmtBps(data.rate)} />
          <StatCard
            label="پاداش در انتظار برداشت"
            value={`${fmtUsdt(data.pendingReward, global.usdtDecimals)} ${global.usdtSymbol}`}
          />
          <StatCard
            label="مجموع دریافتی"
            value={`${fmtUsdt(data.totalClaimed, global.usdtDecimals)} ${global.usdtSymbol}`}
          />
          <StatCard
            label="درآمد رفرال (کل)"
            value={`${fmtUsdt(data.refTotalEarned, global.usdtDecimals)} ${global.usdtSymbol}`}
          />
          <StatCard
            label="درآمد رفرال (در انتظار)"
            value={`${fmtUsdt(data.refPendingReward, global.usdtDecimals)} ${global.usdtSymbol}`}
          />
          <StatCard label="رفرال‌های فعال" value={data.activeReferrals.toString()} />
          <StatCard label="زیرمجموعه مستقیم (F1)" value={data.f1Count.toString()} />
          <StatCard label="تعداد برداشت‌ها" value={data.claimCount.toString()} />
          <StatCard label="سطح رفرال" value={data.level.toString()} />
          <StatCard label="وضعیت استیک" value={data.active ? "فعال" : "غیرفعال"} />
          <StatCard label="بلک‌لیست" value={data.blacklisted ? "بله" : "خیر"} />
          <StatCard label="معرف (Referrer)" value={shortAddr(data.referrer)} />
        </div>
      )}
    </section>
  );
}

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>ArbiSmart — داشبورد خواندنی قرارداد</h1>
        <a href={POLYGONSCAN_URL} target="_blank" rel="noreferrer" className="contract-link">
          مشاهده در Polygonscan ↗
        </a>
      </header>
      <RiskBanner />
      <GlobalSection />
      <UserLookup />
      <footer>
        داده‌ها مستقیماً و فقط از طریق فراخوانی توابع view قرارداد هوشمند روی شبکه‌ی Polygon
        خوانده می‌شوند. این صفحه هیچ تراکنش نوشتنی (stake / claim / topUp) ارسال نمی‌کند.
      </footer>
    </div>
  );
}
