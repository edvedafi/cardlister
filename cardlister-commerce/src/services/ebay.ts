import { TransactionBaseService } from '@medusajs/medusa';
import OnboardingRepository from '../repositories/onboarding';
import { EntityManager } from 'typeorm';

type InjectedDependencies = {
  manager: EntityManager;
};

class OnboardingService extends TransactionBaseService {
  protected onboardingRepository_: typeof OnboardingRepository;

  constructor({ manager }: InjectedDependencies) {
    super(arguments[0]);

  }


}

export default OnboardingService;
