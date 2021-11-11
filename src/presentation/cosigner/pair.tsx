import { Field, Form, FormikProps, withFormik } from 'formik';
import React from 'react';
import Shell from '../components/shell';
import * as Yup from 'yup';
import Button from '../components/button';
import { create2of2MultisigAccountData } from '../../domain/account';
import { CosignerExtraData } from '../../domain/wallet';
import { decrypt } from '../../application/utils';
import { EncryptedMnemonic } from '../../domain/encrypted-mnemonic';
import { Cosigner, MockedCosigner } from '../../domain/cosigner';
import { Network } from '../../domain/network';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { setRestrictedAssetData } from '../../application/redux/actions/wallet';
import { DEFAULT_BASE_DERIVATION_PATH } from 'ldk';
import { useHistory } from 'react-router';
import { PAIR_SUCCESS_COSIGNER_ROUTE } from '../routes/constants';

interface OptInFormProps {
  onSubmit: (values: OptInFormValues) => Promise<void>;
}

interface OptInFormValues {
  password: string;
  derivationPath: string;
}

const optInForm = (props: FormikProps<OptInFormValues>) => {
  const { touched, errors, isSubmitting } = props;

  const touchedAndError = (value: keyof OptInFormValues) => touched[value] && errors[value];

  return (
    <Form>
      <p className="mb-2">Password</p>
      <Field
        type="password"
        name="password"
        placeholder="*******"
        className="focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 border-2 rounded-md"
      />
      {touchedAndError('password') && <div className="text-red">{errors.password}</div>}

      <p className="mb-2">Derivation path</p>
      <Field
        type="text"
        name="derivationPath"
        className="focus:ring-primary focus:border-primary placeholder-grayLight block w-2/5 border-2 rounded-md"
      />

      {touchedAndError('derivationPath') && <div className="text-red">{errors.derivationPath}</div>}
      <Button className="mt-3 text-base" disabled={isSubmitting} type="submit">
        Pair with cosigner
      </Button>
    </Form>
  );
};

const OptInFormikForm = withFormik<OptInFormProps, OptInFormValues>({
  validationSchema: Yup.object().shape({
    password: Yup.string().required(),
    derivationPath: Yup.string()
      .required()
      .matches(/^(m\/)?(\d+'?\/)*\d+'?$/, () => 'invalid BIP32 derivation path'),
  }),

  mapPropsToValues: () => ({
    cosignerURL: '',
    derivationPath: DEFAULT_BASE_DERIVATION_PATH,
    password: '',
  }),

  handleSubmit: async (values, { props }) => {
    await props.onSubmit(values);
  },

  displayName: 'OptInForm',
})(optInForm);

export interface PairCosignerProps {
  encryptedMnemonic: EncryptedMnemonic;
  network: Network;
  explorerURL: string;
}

const PairCosignerView: React.FC<PairCosignerProps> = ({
  encryptedMnemonic,
  network,
  explorerURL,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const history = useHistory();

  const onSubmit = async (values: OptInFormValues) => {
    const walletSignerData = {
      mnemonic: decrypt(encryptedMnemonic, values.password),
      baseDerivationPath: values.derivationPath,
    };

    // cosigner should be created from values.cosignerURL
    const cosigner: Cosigner = new MockedCosigner(network);

    const multisigAccountData = await create2of2MultisigAccountData<CosignerExtraData>(
      walletSignerData,
      await cosigner.xPub(),
      network,
      { cosignerURL: 'http://cosigner.URL' },
      explorerURL
    );

    await dispatch(setRestrictedAssetData(multisigAccountData));
    history.push(PAIR_SUCCESS_COSIGNER_ROUTE);
  };

  return (
    <Shell>
      <h2 className="mb-4 text-3xl font-medium">Add a new 2-of-2 Account</h2>
      <OptInFormikForm onSubmit={onSubmit} />
    </Shell>
  );
};

export default PairCosignerView;
