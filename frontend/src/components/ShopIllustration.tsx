export function ShopIllustration() {
  return (
    <svg
      className="shop-illustration"
      viewBox="0 0 600 540"
      role="img"
      aria-label="Ilustración de una tienda local con plantas y bolsas de compra"
    >
      <defs>
        <pattern id="weave" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 12h24M12 0v24" stroke="#d9debd" strokeWidth=".8" />
        </pattern>
      </defs>
      <rect x="40" y="30" width="530" height="460" rx="240" fill="#e3e6cf" />
      <rect x="40" y="30" width="530" height="460" rx="240" fill="url(#weave)" />
      <ellipse cx="312" cy="463" rx="228" ry="16" fill="#bdc6ad" />
      <path d="M174 158h264v285H174z" fill="#fff9eb" />
      <path d="M190 258h226v185H190z" fill="#eddbc0" />
      <rect x="214" y="275" width="72" height="168" rx="3" fill="#294f41" />
      <path d="M226 289h48v88h-48z" fill="#b9d0bb" />
      <circle cx="274" cy="395" r="3" fill="#e9b570" />
      <rect x="303" y="275" width="96" height="107" rx="3" fill="#294f41" />
      <path d="M310 283h82v92h-82z" fill="#cbd9bd" />
      <path d="M351 283v92" stroke="#294f41" strokeWidth="5" />
      <path d="M150 211l29-58h251l32 58z" fill="#e78660" />
      <path
        d="M195 153h35l-14 58h-36zM270 153h35v58h-39zM345 153h35l13 58h-36zM415 153h15l32 58h-33z"
        fill="#fff3db"
      />
      <path
        d="M150 211v14q15 25 30 0v-14M180 211v14q18 25 36 0v-14M216 211v14q25 25 50 0v-14M266 211v14q20 25 39 0v-14M305 211v14q26 25 52 0v-14M357 211v14q18 25 36 0v-14M393 211v14q18 25 36 0v-14M429 211v14q17 25 33 0v-14"
        fill="#df7651"
      />
      <rect x="218" y="98" width="175" height="43" rx="5" fill="#183d34" />
      <text
        x="305"
        y="126"
        textAnchor="middle"
        fill="#fff3db"
        fontFamily="Georgia,serif"
        fontSize="22"
      >
        PatziShop
      </text>
      <rect x="309" y="393" width="86" height="14" rx="4" fill="#9b6c44" />
      <path d="M107 417h47l-8 46h-31z" fill="#d18157" />
      <path
        d="M130 420v-75m0 42q-42-5-39-30q35-3 39 30m0-15q42-5 39-30q-35-3-39 30m0-16q-24-11-18-32q22 3 18 32"
        fill="#57734c"
        stroke="#57734c"
        strokeWidth="3"
      />
      <path d="M430 385h53l5 66h-63z" fill="#ecc273" />
      <path d="M443 388v-12a15 15 0 0 1 30 0v12" fill="none" stroke="#ae7d45" strokeWidth="4" />
      <path d="M473 414h46l5 45h-56z" fill="#355e4d" />
      <path d="M485 414v-9a11 11 0 0 1 22 0v9" fill="none" stroke="#355e4d" strokeWidth="4" />
      <path
        d="M85 172l7-18 7 18 18 7-18 7-7 18-7-18-18-7zM478 104l5-13 5 13 13 5-13 5-5 13-5-13-13-5z"
        fill="#aebc8b"
      />
    </svg>
  );
}
