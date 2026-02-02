import traceback

def run_python_code(user_code: str, function_name: str, test_cases: list):
    """
    Safely executes user code against test cases.
    Returns detailed pass/fail results per test.
    """

    results = []
    all_passed = True

    # Execution environment
    exec_globals = {}
    exec_locals = {}

    try:
        # Compile + load user code
        exec(user_code, exec_globals, exec_locals)
    except Exception as e:
        # Syntax / definition error
        return {
            "passed": False,
            "testResults": [
                {
                    "input": None,
                    "expected": None,
                    "actual": None,
                    "passed": False,
                    "error": f"Code execution failed:\n{traceback.format_exc()}"
                }
            ]
        }

    # Function existence check
    if function_name not in exec_locals:
        return {
            "passed": False,
            "testResults": [
                {
                    "input": None,
                    "expected": None,
                    "actual": None,
                    "passed": False,
                    "error": f"Function '{function_name}' is not defined."
                }
            ]
        }

    func = exec_locals[function_name]

    # Run each test case
    for tc in test_cases:
        try:
            inputs = tc["input"]
            expected = tc["output"]

            # Support dict-style inputs
            if isinstance(inputs, dict):
                actual = func(**inputs)
            else:
                actual = func(inputs)

            passed = actual == expected
            if not passed:
                all_passed = False

            results.append({
                "input": inputs,
                "expected": expected,
                "actual": actual,
                "passed": passed
            })

        except Exception as e:
            all_passed = False
            results.append({
                "input": tc.get("input"),
                "expected": tc.get("output"),
                "actual": None,
                "passed": False,
                "error": traceback.format_exc()
            })

    return {
        "passed": all_passed,
        "testResults": results
    }
