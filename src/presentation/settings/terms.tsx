import React from 'react';
import ShellPopUp from '../components/shell-popup';

const SettingsTerms: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Terms of Service"
    >
      <div className="h-25.75 overflow-y-scroll">
        <h2 className="font-regular my-8 text-base text-left">1. Terms</h2>
        <p className="font-regular my-8 text-sm text-left">
          By installing the Marina extension, you are agreeing to be bound by these terms of
          service, all applicable laws and regulations, and agree that you are responsible for
          compliance with any applicable local laws. If you do not agree with any of these terms,
          you are prohibited from using or accessing this software. The materials contained in this
          extension are protected by applicable copyright and trademark law.
        </p>

        <h2 className="font-regular my-8 text-base text-left">2. Use License</h2>
        <p className="font-regular my-8 text-sm text-left">
          Permission is granted to temporarily download one copy of the materials (information or
          software) on Marina's extension for personal, non-commercial transitory viewing only. This
          is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        <p className="font-regular my-8 text-sm text-left">modify or copy the materials;</p>
        <p className="font-regular my-8 text-sm text-left">
          use the materials for any commercial purpose, or for any public display (commercial or
          non-commercial);
        </p>
        <p className="font-regular my-8 text-sm text-left">
          attempt to decompile or reverse engineer any software contained on Marina extension;
        </p>
        <p className="font-regular my-8 text-sm text-left">
          remove any copyright or other proprietary notations from the materials; or
        </p>
        <p className="font-regular my-8 text-sm text-left">
          transfer the materials to another person or "mirror" the materials on any other server.
        </p>
        <p className="font-regular my-8 text-sm text-left">
          This license shall automatically terminate if you violate any of these restrictions and
          may be terminated by Marina at any time. Upon terminating your viewing of these materials
          or upon the termination of this license, you must destroy any downloaded materials in your
          possession whether in electronic or printed format.
        </p>

        <h2 className="font-regular my-8 text-base text-left">3. Disclaimer</h2>
        <p className="font-regular my-8 text-sm text-left">
          The materials on Marina extension are provided on an 'as is' basis. Marina makes no
          warranties, expressed or implied, and hereby disclaims and negates all other warranties
          including, without limitation, implied warranties or conditions of merchantability,
          fitness for a particular purpose, or non-infringement of intellectual property or other
          violation of rights. Further, Marina does not warrant or make any representations
          concerning the accuracy, likely results, or reliability of the use of the materials on its
          extension or otherwise relating to such materials or on any sites linked to this site.
        </p>

        <h2 className="font-regular my-8 text-base text-left">4. Limitations</h2>
        <p className="font-regular my-8 text-sm text-left">
          In no event shall Marina or its suppliers be liable for any damages (including, without
          limitation, damages for loss of data or profit, or due to business interruption) arising
          out of the use or inability to use the materials on Marina's extension, even if Marina or
          a Marina authorized representative has been notified orally or in writing of the
          possibility of such damage. Because some jurisdictions do not allow limitations on implied
          warranties, or limitations of liability for consequential or incidental damages, these
          limitations may not apply to you.
        </p>
        <p className="font-regular my-8 text-sm text-left">
          Our Services provide a number of ways for you to secure your Wallet and help ensure you,
          and only you, are able to access and transact through your Wallet. These features include
          mnemonics and password.
          <br />
          <b>We do not store or have access to your mnemonics, passwords or private keys.</b>
          <br />
          It is your responsibility to carefully guard your mnemonics and password and any other
          means we may provide for you to secure and access your Wallet. If you forget or lose your
          means of authentication GreenAddress has no way to recover them for you and you may
          permanently lose access to any funds you have stored in your Wallet.
        </p>

        <h2 className="font-regular my-8 text-base text-left">5. Accuracy of materials</h2>
        <p className="font-regular my-8 text-sm text-left">
          The materials appearing on Marina's extension could include technical, typographical, or
          photographic errors. Marina does not warrant that any of the materials on its extension
          are accurate, complete or current. Marina may make changes to the materials contained on
          its extension at any time without notice. However Marina does not make any commitment to
          update the materials.
        </p>

        <h2 className="font-regular my-8 text-base text-left">6. Links</h2>
        <p className="font-regular my-8 text-sm text-left">
          Marina has not reviewed all of the sites linked to its extension and is not responsible
          for the contents of any such linked site. The inclusion of any link does not imply
          endorsement by Marina of the site. Use of any such linked extension is at the user's own
          risk.
        </p>

        <h2 className="font-regular my-8 text-base text-left">7. Modifications</h2>
        <p className="font-regular my-8 text-sm text-left">
          Marina may revise these terms of service for its extension at any time without notice. By
          using this extension you are agreeing to be bound by the then current version of these
          terms of service.
        </p>

        <h2 className="font-regular my-8 text-base text-left">8. Governing Law</h2>
        <p className="font-regular my-8 text-sm text-left">
          These terms and conditions are governed by and construed in accordance with the laws of
          Estonia and you irrevocably submit to the exclusive jurisdiction of the courts in that
          location.
        </p>
      </div>
    </ShellPopUp>
  );
};

export default SettingsTerms;
