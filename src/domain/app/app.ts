import { IError } from '../common';
import { Entity } from '../core/Entity';

export interface IApp {
  errors?: Record<string, IError>;
  isAuthenticated: boolean;
  isWalletVerified: boolean;
  isOnboardingCompleted: boolean;
}

/**
 * Entity App
 *
 *
 * @member createApp factory method to create app
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class App extends Entity<IApp> {
  get isAuthenticated(): boolean {
    return this.props.isAuthenticated;
  }

  get isWalletVerified(): boolean {
    return this.props.isWalletVerified;
  }

  get isOnboardingCompleted(): boolean {
    return this.props.isOnboardingCompleted;
  }

  /**
   * @param props - App props
   */
  private constructor(props: IApp) {
    super(props);
  }

  /**
   * Create an app.
   *
   * @remarks
   * Factory Method that handles creation of the App entity.
   *
   * @param props - The app props
   * @returns The initial state of the App
   */
  public static createApp(props: IApp): App {
    const appProps = {
      isAuthenticated: props.isAuthenticated,
      isWalletVerified: props.isWalletVerified,
      isOnboardingCompleted: props.isOnboardingCompleted,
    };
    return new App(appProps);
  }
}
