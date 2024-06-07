import type { Logger, MedusaNextFunction, MedusaRequest, MedusaResponse, User, UserService } from '@medusajs/medusa';

const registerLoggedInUser = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) => {
  let loggedInUser: User | null = null;


  try {
    const logger =
      req.scope.resolve('logger') as Logger;

    logger?.info(`req.user: ${JSON.stringify(req.user)}`);

    if (req.user && req.user.userId) {
      const userService =
        req.scope.resolve('userService') as UserService;
      loggedInUser = await userService.retrieve(req.user.userId);
    }

    req.scope.register({
      loggedInUser: {
        resolve: () => loggedInUser,
      },
    });
  } catch (e) {
    console.error('Fake Error:', e);
  }


  next();
  // throw 'FUCK';
};

// export const config: MiddlewaresConfig = {
//   routes: [
//     {
//       matcher: /^\/admin\/(?!auth).*/,
//       middlewares: [cors({
//         credentials: true,
//         origin: parseCorsOrigins(process.env.ADMIN_CORS ?? ''),
//       }), authenticate(), registerLoggedInUser],
//     },
//   ],
// };