import { useEffect, useRef, useState } from 'react';
import { verdicts, type Scenario } from '../../content/index.ts';
import { ForensicDemo } from '../../demo/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';
import { PaperClip } from './marks.tsx';

const STAMP = {
  altered: { main: bi('Refer to investigations', 'להעביר לחקירה'), sub: bi('Hold payout · Case 24-08817', 'לעכב תשלום · תיק 24-08817') },
  genuine: { main: bi('Cleared · Fast-track', 'אושר · מסלול מהיר'), sub: bi('Approve $450 · Case 24-08817', 'לאשר ₪450 · תיק 24-08817') },
};

type Landed = { readonly scenario: Scenario; readonly run: number };

function Stamp({ landed, className }: { landed: Landed; className: string }) {
  const { t } = useLang();
  return (
    <span className={`v-stamp v-stamp--${landed.scenario} ${className}`} aria-hidden="true">
      <span className="v-stamp__main">{t(STAMP[landed.scenario].main)}</span>
      <span className="v-stamp__sub">{t(STAMP[landed.scenario].sub)}</span>
    </span>
  );
}

export function Exhibit() {
  const { t } = useLang();
  const [scenario, setScenario] = useState<Scenario>('altered');
  const [landed, setLanded] = useState<Landed | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // The demo exposes its verdict through `data-done`; the stamp lands on each false → true transition.
  useEffect(() => {
    const fd = wrapRef.current?.querySelector('.fd');
    if (!fd) return;
    let wasDone = fd.hasAttribute('data-done');
    let run = 0;
    const mo = new MutationObserver(() => {
      const done = fd.hasAttribute('data-done');
      if (done === wasDone) return;
      wasDone = done;
      if (!done) {
        setLanded(null);
        return;
      }
      run += 1;
      setLanded({ scenario: fd.classList.contains('fd--genuine') ? 'genuine' : 'altered', run });
    });
    mo.observe(fd, { attributes: true, attributeFilter: ['data-done'] });
    return () => mo.disconnect();
  }, []);

  const onScenarioChange = (s: Scenario) => {
    setLanded(null);
    setScenario(s);
  };

  return (
    <div className="v-exhibit">
      <div className="v-exhibit__board">
        <span className="v-exhibit__label">{t(bi('Exhibit A', 'מוצג א׳'))}</span>
        <PaperClip className="v-clip v-exhibit__clip" />
        <div ref={wrapRef} className="v-exhibit__sheet">
          <ForensicDemo scenario={scenario} onScenarioChange={onScenarioChange} />
          {landed && <Stamp key={landed.run} landed={landed} className="v-stamp--overlay" />}
        </div>
      </div>

      <div className="v-disposition">
        <div className="v-disposition__field">
          <span className="v-label">{t(bi('Verity recommends', 'המלצת Verity'))}</span>
          <div className="v-disposition__line">
            {landed ? (
              <>
                <Stamp key={landed.run} landed={landed} className="v-stamp--inline" />
                <span className="v-typed v-disposition__typed">{t(verdicts[landed.scenario].action)}</span>
              </>
            ) : (
              <span className="v-typed v-typed--pending">{t(bi('Awaiting examination…', 'ממתין לבדיקה…'))}</span>
            )}
          </div>
        </div>
        <div className="v-disposition__field">
          <span className="v-label">{t(bi('Final decision by', 'ההחלטה הסופית'))}</span>
          <div className="v-disposition__line">
            <span className="v-typed">{t(bi('Your adjuster', 'השמאי שלכם'))}</span>
          </div>
        </div>
        <p className="v-disposition__hint">
          {scenario === 'altered'
            ? t(bi('Switch to the genuine receipt to see a clean claim cleared.', 'עברו לקבלה האמיתית כדי לראות תביעה נקייה עוברת.'))
            : t(bi('Switch back to the altered receipt to see it referred.', 'חזרו לקבלה המזויפת כדי לראות אותה מועברת לחקירה.'))}
        </p>
      </div>
    </div>
  );
}
