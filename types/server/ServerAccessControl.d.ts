/**
 * Server-side implementation of AccessControl that loads access rules from AuthDB.
 */
export default class ServerAccessControl extends AccessControl {
    /**
     * @inheritdoc
     */
    _getUserAccess(username: any): Promise<{
        subject: string;
        access: string;
        target: string;
    }[]>;
    /**
     * @inheritdoc
     */
    _getUserGroups(username: any): Promise<string[]>;
}
import AccessControl from '../AccessControl.js';
