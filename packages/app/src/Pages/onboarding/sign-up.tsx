import AsyncButton from "@/Components/Button/AsyncButton";
import { trackEvent } from "@/Utils";
import { generateNewLogin, generateNewLoginKeys } from "@/Utils/Login";
import { NotEncrypted } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useState, use, FormEvent } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import { useNavigate, Link } from "react-router-dom";
import { NewUserState } from ".";
import { Bech32Regex } from "@snort/shared";

export default function SignUp() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const system = use(SnortContext);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (CONFIG.signUp.quickStart) {
      return generateNewLogin(await generateNewLoginKeys(), system, key => Promise.resolve(new NotEncrypted(key)), {
        name,
      }).then(() => {
        trackEvent("Login", { newAccount: true });
        navigate("/trending/notes");
      });
    }
    navigate("/login/sign-up/profile", {
      state: {
        name: name,
      } as NewUserState,
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.match(Bech32Regex)) {
      e.preventDefault();
    } else {
      setName(val);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <img src={CONFIG.icon} width={48} height={48} className="rounded-lg mr-auto ml-auto" />
      <div className="flex flex-col gap-4 items-center">
        <h1>
          <FormattedMessage defaultMessage="Sign Up" />
        </h1>
        <FormattedMessage defaultMessage="What should we call you?" />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          autoFocus={true}
          placeholder={formatMessage({
            defaultMessage: "Name or nym",
            id: "aHje0o",
          })}
          value={name}
          onChange={onChange}
          className="new-username"
        />
        <AsyncButton className="primary" disabled={name.length === 0} onClick={onSubmit}>
          {CONFIG.signUp.quickStart ? (
            <FormattedMessage
              description="Button text after entering username in quick signup"
              defaultMessage="Go"
              id="0zASjL"
            />
          ) : (
            <FormattedMessage defaultMessage="Next" />
          )}
        </AsyncButton>
      </form>
      <div className="flex flex-col gap-4 items-center">
        <Link to={"/login"}>
          <FormattedMessage defaultMessage="Already have an account?" />
        </Link>
        <AsyncButton className="secondary" onClick={() => navigate("/login")}>
          <FormattedMessage defaultMessage="Sign In" />
        </AsyncButton>
      </div>
    </div>
  );
}
